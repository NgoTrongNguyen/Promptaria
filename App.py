import torch
import torch.nn as nn
import numpy as np
from scipy.ndimage import zoom
from torch.utils.data import Dataset, DataLoader
import random
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_terrain_model(model_path):
    # 2. Khởi tạo lại cấu trúc mạng (Phải giống hệt cấu trúc lúc train)
    model = UNet() 
    
    try:
        # 3. Nạp trọng số từ file đã lưu
        # map_location giúp nạp model được train từ GPU sang máy chỉ có CPU mà không lỗi
        state_dict = torch.load(model_path, map_location=device)
        model.load_state_dict(state_dict)
        
        model.to(device)
        model.eval() # Chuyển sang chế độ dự đoán (Evaluation mode)
        
        print(f"--- Đã nạp thành công model từ: {model_path} ---")
        return model
    except FileNotFoundError:
        print(f"Lỗi: Không tìm thấy file {model_path}. Hãy kiểm tra lại tên file.")
        return None

import random

def refine_terrain(matrix_2d):
    rows = len(matrix_2d)
    cols = len(matrix_2d[0])
    
    # Định nghĩa ID
    AIR = 0
    GRASS = 1
    DIRT = 2
    STONE = 3
    WOOD = 4
    LEAVES = 5
    COAL = 6
    IRON = 7
    GOLD = 8
    DIAMOND = 9
    EMERALE = 10 

    # Tạo bản sao
    refined = [row[:] for row in matrix_2d]

    for r in range(rows):
        for c in range(cols):
            # Chỉ xử lý các khối đất gốc (giá trị ban đầu là 1)
            if matrix_2d[r][c] == 0:
                continue
                
            is_surface = (r == 0) or (matrix_2d[r-1][c] == 0)
            depth_ratio = r / rows
            rand = random.random()
            
            if is_surface:
                # 10% xác suất mọc một cái cây tại điểm này
                if rand < 0.10:
                    refined[r][c] = DIRT # Gốc cây nằm trên đất
                    
                    # Vẽ thân cây (cao 2-3 ô) ngược lên trên
                    trunk_height = random.randint(2, 3)
                    for i in range(1, trunk_height + 1):
                        if r - i >= 0:
                            refined[r - i][c] = WOOD
                            
                    # Vẽ tán lá đơn giản xung quanh ngọn cây
                    leaf_top = r - trunk_height - 1
                    if leaf_top >= 0:
                        # Điểm ngọn lá
                        refined[leaf_top][c] = LEAVES
                        # Lá xung quanh ngọn
                        for dc in [-1, 1]:
                            if 0 <= c + dc < cols:
                                refined[leaf_top + 1][c + dc] = LEAVES
                else:
                    refined[r][c] = GRASS
            else:
                # Logic tầng sâu giữ nguyên
                if depth_ratio < 0.4:
                    refined[r][c] = DIRT if rand < 0.8 else STONE
                else:
                    if rand < 0.05: # 5% xác suất có quặng
                        refined[r][c] =random.randint(6,10)
                    else:
                        refined[r][c] = STONE

    # Chuyển list of lists về dạng list of tensors như bạn yêu cầu
    return torch.stack([torch.tensor(row) for row in refined])

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hoặc ["http://127.0.0.1:5500"] nếu bạn serve FE ở port này
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, OPTIONS, PUT, DELETE...
    allow_headers=["*"],
)


# Nạp model
model = load_terrain_model("C:\\VSCode Project\\Promptaria\\terrain_gen20.pth")

class InputData(BaseModel):
    Matrix: str

@app.get("/")
def read_root():
    return {"message": "Connected!"}

@app.post("/process")
def process_signal(data: InputData):
    with torch.no_grad():
        input = generate_hybrid_terrain(64, 64)
        dummy_input = torch.tensor(input, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
        predicted = model(dummy_input)
        final_map = (predicted > 0.5).float()
        refined_map = refine_terrain(final_map.squeeze())
    return {"result": refined_map.tolist()}
