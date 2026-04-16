import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import random
from scipy.ndimage import zoom

def generate_hybrid_terrain(size_h=64, size_w=64):
    # Khởi tạo ma trận (Dọc x Ngang)
    terrain = np.zeros((size_h, size_w)) 

    # ==========================================
    # LAYER 1: Bề mặt đa dạng và nhiều chi tiết
    # ==========================================
    x = np.linspace(0, 1, size_w)
    seed = random.random() * 100
    
    # Kết hợp 4 lớp sóng từ to đến nhỏ (Fractal Noise)
    wave1 = np.sin(x * 3 + seed) * 8          # Dáng đồi chính (To, thoai thoải)
    wave2 = np.cos(x * 8 + seed * 2) * 4      # Các mỏm đất lồi lõm
    wave3 = np.sin(x * 20 + seed * 3) * 2     # Đường nét gồ ghề nhỏ
    wave4 = np.cos(x * 40 + seed * 4) * 1     # Sỏi đá lởm chởm trên cùng
    
    # Cộng dồn lại để tạo bề mặt thực tế
    base_line = size_h // 3 # Mặt đất bắt đầu từ 1/3 bản đồ
    surface_h = (wave1 + wave2 + wave3 + wave4 + base_line).astype(int)

    for i in range(size_w):
        # Đảm bảo không bị văng index ra ngoài ma trận
        h_start = np.clip(surface_h[i], 0, size_h - 1)
        terrain[h_start:, i] = 1 

    # ==========================================
    # LAYER 2: Hang động (Đường hầm mảnh, vừa phải)
    # ==========================================
    # Chia tỷ lệ động: Đảm bảo độ phân giải đủ lớn để hang không bị mập
    noise_res_h = max(6, int(size_h / 8)) 
    noise_res_w = max(6, int(size_w / 8)) 
    low_res_noise = np.random.rand(noise_res_h, noise_res_w)
    
    # Phóng đại nhiễu
    cave_map = zoom(low_res_noise, (size_h / noise_res_h, size_w / noise_res_w), order=1)

    # Lấy dải CỰC HẸP ở giữa (0.47 đến 0.53). 
    # Dải này tạo ra các viền dạng "sợi/ống" thay vì một đốm to.
    cave_mask = (cave_map > 0.43) & (cave_map < 0.57) 

    # ==========================================
    # LAYER 3: Áp dụng hang động một cách ngẫu nhiên
    # ==========================================
    for y in range(size_h):
        for x_idx in range(size_w):
            if terrain[y, x_idx] == 1 and cave_mask[y, x_idx]:
                
                # Điều kiện 1: Phải cách mặt đất một vùng an toàn (8 block)
                if y > surface_h[x_idx] + 8:
                    
                    # Điều kiện 2: Random ngắt quãng. 
                    # Chỉ 75% số điểm của "đường hầm" thực sự biến thành không khí,
                    # 25% còn lại giữ nguyên đất để hang có đất đá chắn ngang, bớt trống trải.
                    if random.random() < 0.75: 
                        terrain[y, x_idx] = 0

    return terrain

# 2. Hàm tạo mặt nạ hình nón (Cone Mask)
def apply_cone_mask(terrain):
    size = terrain.shape[0]
    mask = np.zeros((size, size))
    # Giả sử góc nhìn từ giữa đỉnh xuống theo hình nón
    for y in range(size):
        for x in range(size):
            if abs(x - size//2) < y * 0.5: # Hình nón góc hẹp
                mask[y, x] = 1
    return terrain * mask

class TerrainDataset(Dataset):
    def __init__(self, num_samples=2000, size=64):
        self.num_samples = num_samples
        self.size = size

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        # Tạo map đầy đủ
        full_terrain = generate_hybrid_terrain(self.size, self.size)
        # Tạo map bị che (chỉ để lại hình nón)
        masked_terrain = apply_cone_mask(full_terrain)
        
        # Chuyển sang Tensor (C, H, W)
        x = torch.tensor(masked_terrain, dtype=torch.float32).unsqueeze(0)
        y = torch.tensor(full_terrain, dtype=torch.long)
        return x, y
    
class UNet(nn.Module):
    def __init__(self):
        super(UNet, self).__init__()
        
        # Encoder
        self.enc1 = self.conv_block(1, 32)
        self.enc2 = self.conv_block(32, 64)
        
        # Bottleneck
        self.bottleneck = self.conv_block(64, 128)
        
        # Decoder
        self.up2 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.dec2 = self.conv_block(64, 64)
        self.up1 = nn.ConvTranspose2d(64, 32, kernel_size=2, stride=2)
        self.dec1 = self.conv_block(32, 32)
        
        self.final = nn.Conv2d(32, 1, kernel_size=1)
        self.sigmoid = nn.Sigmoid()

    def conv_block(self, in_ch, out_ch):
        return nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.ReLU(),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.ReLU()
        )

    def forward(self, x):
        # Encoder với Pooling
        e1 = self.enc1(x)
        p1 = nn.MaxPool2d(2)(e1)
        e2 = self.enc2(p1)
        p2 = nn.MaxPool2d(2)(e2)
        
        # Bottleneck
        b = self.bottleneck(p2)
        
        # Decoder với Upsampling
        d2 = self.up2(b)
        d2 = self.dec2(d2)
        d1 = self.up1(d2)
        d1 = self.dec1(d1)
        
        return self.sigmoid(self.final(d1))
    
# Cấu hình
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = UNet().to(device)
dataset = TerrainDataset(num_samples=2000)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)
criterion = nn.BCELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Loop huấn luyện
epochs = 20
print("Bắt đầu huấn luyện...")
for epoch in range(epochs):
    total_loss = 0
    for batch_x, batch_y in dataloader:
        batch_x = batch_x.to(device)
        batch_y = batch_y.float().unsqueeze(1).to(device)
        
        optimizer.zero_grad()
        outputs = model(batch_x)
        loss = criterion(outputs, batch_y)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
    if (epoch + 1) % 5 == 0:
        torch.save(model.state_dict(), f"terrain_gen{epoch+1}.pth")
    print(f"Epoch [{epoch+1}/{epochs}], Loss: {total_loss/len(dataloader):.4f}")

model.eval()
with torch.no_grad():
    for _ in range(10):
        input = generate_hybrid_terrain(64, 64)
        masked_input = apply_cone_mask(input)
        dummy_input = torch.tensor(masked_input, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
        predicted = model(dummy_input)
        predicted = torch.round(predicted)
        print(dummy_input.cpu().numpy())
        print("Dự đoán mẫu:", predicted.cpu().numpy())