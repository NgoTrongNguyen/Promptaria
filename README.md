# Promptaria
📌 Giới thiệu
Dự án này là một Game 2D sử dụng mô hình Unet kết hợp với FastAPI để xây dựng API. Người dùng có thể gửi yêu cầu qua HTTP và nhận phản hồi từ mô hình.

⚙️ Yêu cầu hệ thống
Python 3.9+

Thư viện: fastapi, uvicorn, pydantic, torch 

Trình duyệt hoặc công cụ test API (Postman, curl)

Cài đặt thư viện:

bash
pip install fastapi uvicorn pydantic torch
🚀 Cách chạy server
Chạy bằng uvicorn:

bash
uvicorn App:app --reload

Server mặc định chạy tại:

Code
http://127.0.0.1:8000
