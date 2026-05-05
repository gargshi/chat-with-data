# 📊 Chat with Your Data (CSV AI Assistant)

An interactive web application that allows users to upload CSV datasets and ask natural language questions about their data. The app provides instant previews, dataset insights, and AI-powered responses.

---

## 🚀 Features

* 📁 Upload CSV files
* 📋 Automatic dataset preview (table view)
* 📊 Dataset summary (rows, columns, data types)
* 💬 Chat interface to query your data
* 🧠 AI-powered responses based on dataset
* 🗂 Dataset history (load / delete previous uploads)
* 🎨 Clean UI with Bootstrap + modern styling

---

## 🧩 Tech Stack

### Frontend

* HTML, CSS, JavaScript
* Bootstrap (UI components)
* Custom chat UI

### Backend

* Python (FastAPI / Flask)
* Pandas (data processing)

---

## 📸 UI Overview

* **Left Panel** → Chat interface
* **Right Panel** → Dataset preview + summary
* **History Sidebar** → Previously uploaded datasets

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/gargshi/chat-with-data.git
cd chat-with-data
```

### 2. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate   # macOS/Linux
venv\Scripts\activate      # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the server

```bash
uvicorn main:app --reload
```

### 5. Open in browser

```
http://127.0.0.1:8000
```

---

## 📂 Project Structure

```
chat-with-data/
│
├── static/              # CSS, JS
├── templates/           # HTML files
├── main.py              # Backend server
├── requirements.txt
└── README.md
```

---

## 📊 Dataset Processing

When a CSV is uploaded, the backend extracts:

* Total rows & columns
* Column data types
* Data preview (head)
* Tail preview
* Shape of dataset

---

## 💬 Chat Flow

1. Upload dataset
2. Dataset is stored and previewed
3. Ask questions in chat
4. Backend processes query using dataset
5. Response is returned and displayed

---

## 🛠 Future Improvements

* 🔍 Column search & filtering
* 📈 Data visualization (charts)
* 🧠 Smarter query understanding
* ☁️ Cloud deployment (AWS / Render)
* 👥 Multi-user authentication

and more!

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## 📜 License

This project is open-source and available under the MIT License.

---

## 🙌 Acknowledgements

* Pandas for data handling
* Bootstrap for UI
* OpenAI / LLM APIs for AI responses

---

## 💡 Inspiration

Built as a beginner-friendly data tool to bridge the gap between raw datasets and meaningful insights using natural language.

---

### ⭐ If you found this useful, consider giving the repo a star!

[![GitHub stars](https://img.shields.io/github/stars/gargshi/chat-with-data?style=social)](https://github.com/gargshi/chat-with-data)