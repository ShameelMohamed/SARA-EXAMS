# SARA EXAMS — Secure Examination Portal

**SARA EXAMS** is a state-of-the-art, secure, role-based examination management web platform and desktop proctoring solution built for **Saranathan College of Engineering**.

---

## 🌟 Key Features

* **🔑 Role-Based Authentication**: Secure Google OAuth integration via Firebase with automatic role resolution for **Students**, **Teachers**, and **Admins**.
* **📝 Flexible Question Formats**: Support for Multiple Choice Questions (MCQ), Multiple Select Questions (MSQ), and interactive Drag-and-Drop Code Line Reordering.
* **📊 CSV Batch Import & Template Export**: Built-in CSV template generation and instant local parsing for bulk question paper uploading.
* **🔒 Secure Desktop Kiosk Proctoring**: Native Electron launcher (`saraexam://` protocol) featuring:
  * Full-screen kiosk lockdown (prevents tab switching, popup creation, and window resizing).
  * System shortcut blocking (`Alt+Tab`, `Alt+F4`, `Ctrl+C`, `Ctrl+V`, `F12`, etc.).
  * Real-time security event auditing (focus loss, window close attempts) logged directly to Firestore.
* **⚡ One-Click Vercel Deployment**: Fully compliant web app structure ready for instant Vercel cloud deployment.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, TailwindCSS v4, Lucide Icons, React Router v7
* **Build Tool**: Vite
* **Backend & Database**: Firebase Auth, Firestore
* **Desktop Launcher**: Electron 44, TypeScript

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js**: v18.0 or higher
* **npm**: v9.0 or higher

### 2. Installation
```bash
# Clone repository
git clone https://github.com/ShameelMohamed/SARA-EXAMS.git

# Navigate to project root
cd SARA-EXAMS

# Install dependencies
npm install
```

### 3. Available Scripts

* **`npm run dev`**: Start the Vite web application local dev server (`http://localhost:5176`).
* **`npm run secure-exam:dev`**: Concurrently start the Vite dev server and the Electron Secure Exam launcher.
* **`npm run secure-exam:start`**: Launch the Electron Desktop Kiosk app independently.
* **`npm run build`**: Build the production Web bundle for Vercel deployment.
* **`npm run secure-exam:build`**: Package the Electron Desktop installer (`dist-electron`).

---

## 🌐 Vercel Deployment

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set Framework Preset to **Vite**.
4. Deploy! Your web portal is instantly live.

---

## 📄 License
Privately developed for **Saranathan College of Engineering**. All rights reserved.
