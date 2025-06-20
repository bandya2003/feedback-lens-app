# 📊 Feedback Lens – AI-Powered Customer Insight Platform

**Live Demo:** [feedbacklens.vercel.app](https://feedback-lens-app.vercel.app)

![Dashboard Preview](https://github.com/user-attachments/assets/b391e0ca-ee70-407a-924f-cbcddca5382b)

<!-- If not hosted locally, use below GitHub-hosted fallback: -->
<!-- ![Dashboard Preview](https://github.com/your-username/feedback-lens-app/assets/b391e0ca-ee70-407a-924f-cbcddca5382b/your-image-id) -->

---

## 🧠 The Problem

Product teams and startups collect vast amounts of customer feedback from surveys, reviews, and support chats — but most of it sits unused in spreadsheets.  

Manually reading, tagging, and analyzing thousands of comments is:

- ❌ Slow
- ❌ Prone to human bias
- ❌ Difficult to scale

**Feedback Lens** was built to automate this workflow using GenAI.

---

## 🔍 Key Features

- ✨ **AI-Powered Analysis**  
  Uses Google’s **Gemini** model (via Genkit) to perform fine-grained **sentiment analysis** and extract **topics** for each comment.

- 📊 **Interactive Dashboard**  
  Visualize sentiment trends, explore topics like *UI/UX*, *Pricing*, or *Performance*, and filter insights dynamically.

- 📁 **Feedback History**  
  Save each analysis to **Firestore**, with a "History" page to access past reports.

- 🧮 **Comparison Mode**  
  Select two reports to generate a **Comparison Dashboard** with:
  - 🟢/🔴 **KPI Deltas**
  - 📈 Overlaid **trend charts**
  - 📌 Highlighted **topic shifts**

---

## ⚙️ Tech Stack

| Layer        | Tech                                |
|--------------|--------------------------------------|
| Frontend     | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend / AI | Google Genkit (Gemini model)         |
| Database     | Google Firestore                     |
| Deployment   | Vercel                               |

---

## 🧠 Core Technical Challenge

> **Challenge:** Hitting API rate limits during large file analysis

### ❌ Initial Prototype:
- One AI call per row
- Scaled poorly
- Frequently timed out

### ✅ Final Solution:
- **Batch processing:** Grouped 15–20 rows per AI call
- Reduced API calls by 90%
- Improved speed and reliability

---

## 💡 Built For

- 🧪 Product Managers
- 📈 Business Analysts
- 📣 User Research Teams
- 🚀 Hackathon & Startup Launches

---

## 🧑‍💻 Built By

Developed by [@bandya2003](https://github.com/bandya2003)  
A full-stack AI project, crafted for clarity and strategy.

---

> “From CSV to Insight – in under 60 seconds.”

