# 🎓 OLP - Online Learning Platform - Complete Learning Management System

A modern, feature-rich Learning Management System built with **React** and **Firebase**, designed to provide seamless educational experiences for students, instructors, and admins.

---

## 📋 Table of Contents

* [Features](#-features)
* [Tech Stack](#-tech-stack)
* [Quick Start](#-quick-start)
* [Installation](#-installation)
* [Firebase Setup](#-firebase-setup)
* [Project Structure](#-project-structure)
* [Usage Guide](#-usage-guide)
* [Advanced Features](#-advanced-features)
* [Deployment](#-deployment)
* [Security Features](#-security-features)
* [Performance Optimizations](#-performance-optimizations)
* [Development Workflow](#-development-workflow)
* [Code Standards](#-code-standards)

---

## ✨ Features

### 🎯 Multi-Role System

* 👨‍🎓 **Students**: Take assignments, view lectures, track progress.
* 👨‍🏫 **Instructors**: Create content, review submissions, manage classes.
* 🛡️ **Admins**: Full system control, user management, analytics.

### 📝 Advanced Assignment System

* Multiple structured questions per assignment.
* **Real-Time Auto-Save** (1 second after typing stops).
* **Code Submissions** (via GitHub, OneCompiler, or snippets).
* Visual progress tracking & deadline countdowns.
* Smooth question navigation (Next/Prev).

### 🎥 Lecture Management

* Supports **YouTube**, direct video files, and external platforms.
* **Masai School Integration** for bootcamp videos.
* Add lecture **notes** and **descriptions**.
* Instructor-level content control.

### 💾 Smart Data Management

* Real-time sync across devices.
* Submission tracking and analytics.
* Auto-save ensures zero data loss.

### 🎨 Modern UI/UX

* **Responsive design** for all screen sizes.
* Built using **Bootstrap 5** and **React Bootstrap**.
* Syntax-highlighted code blocks & toast notifications.

---

## 🛠️ Tech Stack

### Frontend

* **React 18** with hooks
* **React Router v6**
* **Bootstrap 5** + **React Bootstrap**

### Backend & Database

* **Firebase Auth** for secure login
* **Firestore** (NoSQL real-time DB)
* **Firebase Security Rules** for RBAC

### Development Tools

* **Vite** – Lightning-fast dev server
* **ESLint** – Linting
* **Modern CSS** – Variables & custom styles

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/mrpawarGit/OLP---Online-Learning-Platform.git

# Enter project directory
cd lms-project

# Install dependencies
npm install

# Start development server
npm run dev
# Open http://localhost:5173
```

---

## 📦 Installation

### Prerequisites

* Node.js (v16+)
* npm or yarn
* Firebase account

### Step-by-Step

1. **Clone & Install**

```bash
git clone https://github.com/mrpawarGit/OLP---Online-Learning-Platform.git
cd videmy-lms
npm install
```

---

## 🔥 Firebase Setup

### 1. Create Project

* Go to [Firebase Console](https://console.firebase.google.com)
* Click **Create a Project**
* Enable **Authentication** and **Firestore**

### 2. Enable Auth

Sign-in methods:

* ✅ Email/Password

### 3. Firestore Collections

Example schema:

```
users/
  └── uid/
      ├── name
      ├── email
      ├── role (student|instructor|admin)
      └── createdAt

assignments/
  └── assignmentId/
      ├── title
      ├── description
      ├── questions
      ├── deadline
      ├── createdBy
      └── submissions/
          └── userId/
              ├── answers
              ├── gitSubmissions
              ├── submittedAt
              └── isSubmitted

lectures/
  └── lectureId/
      ├── title
      ├── videoUrl
      ├── notes
      ├── createdBy
      └── createdAt
```

### 4. Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && userId == request.auth.uid;
    }

    match /assignments/{assignmentId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && getUserRole() in ['instructor', 'admin'];
      allow update, delete: if isSignedIn() && 
        (getUserRole() == 'admin' || resource.data.createdBy == request.auth.uid);
        
      match /submissions/{userId} {
        allow read, write: if isSignedIn() && userId == request.auth.uid;
        allow read: if isSignedIn() && getUserRole() in ['instructor', 'admin'];
      }
    }

    match /lectures/{lectureId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && getUserRole() in ['instructor', 'admin'];
      allow update, delete: if isSignedIn() && 
        (getUserRole() == 'admin' || resource.data.createdBy == request.auth.uid);
    }
  }
}
```

---

## 📁 Project Structure

```
videmy-lms/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── LoadingSpinner.jsx
│   │       ├── Navbar.jsx
│   │       ├── ProtectedRoute.jsx
│   │       └── PublicRoute.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── AssignmentDetail.jsx
│   │   ├── Assignments.jsx
│   │   ├── CreateAssignment.jsx
│   │   ├── CreateLecture.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Lectures.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── SubmissionReview.jsx
│   │   └── Unauthorized.jsx
│   ├── firebase.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.local
├── package.json
└── README.md
```

---

## 📖 Usage Guide

### 👨‍🎓 For Students

* Sign up/login with the **student** role
* View assignments and lectures
* Auto-save ensures no data loss
* Submit answers with code snippets or GitHub links

### 👨‍🏫 For Instructors

* Create assignments with structured questions
* Add/edit lectures (video + notes)
* Review student submissions and export results

### 👨‍💼 For Admins

* Manage users, roles, and analytics
* Oversee content and monitor system usage

---

## 🖼️ Screenshots

> (You can add actual screenshots here with markdown like `![Dashboard Screenshot](./screenshots/dashboard.png)`)

---

## 🔧 Advanced Features

### Auto-Save

```js
useEffect(() => {
  const timeout = setTimeout(() => {
    saveProgress();
  }, 1000);
  return () => clearTimeout(timeout);
}, [answers, gitSubmissions]);
```

### Structured Question Parsing

```js
const parseQuestionContent = (questionText) => {
  // Auto-formats code, statements, and examples
};
```

### Video Platform Support

* Embedded YouTube
* Direct upload (MP4/WebM)
* Masai integration
* External link support

---

## 🚀 Deployment

### Firebase Hosting

```bash
npm run build       # Build app
firebase deploy     # Deploy to hosting
```

To deploy to a preview channel:

```bash
firebase hosting:channel:deploy production
```

---

## 🔐 Security Features

* Role-based access control
* Secure Firebase rules
* Protected frontend routes
* Input sanitization
* Auth-based restrictions

---

## 📈 Performance Optimizations

* Lazy-loaded routes
* Debounced API calls
* Memoized components
* Code splitting with `React.lazy`
* Tree-shaking & optimized bundle size

---

## 🛠 Development Workflow

1. Fork the repo
2. Create a feature branch

```bash
git checkout -b feature/awesome-feature
```

3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

## ✅ Code Standards

* Use **ESLint** for code linting
* Follow **React Hooks** conventions
* Use **semantic commit messages**
* Comment complex logic
* Ensure **responsive design**

---

**⭐ Star this repo if you found it helpful!**
Made with ❤️ by **Mayur**

---

