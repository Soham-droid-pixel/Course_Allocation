# 🎓 Fr. Conceicao Rodrigues College of Engineering - Elective Course Management System

A comprehensive web-based platform for managing student elective course selections and administrative allocation processes, built with **React** frontend and **FastAPI** backend.

---

## 🌟 **System Overview**

The Elective Course Management System streamlines the entire process of course selection and allocation for engineering students. Students can browse available courses, submit preferences, and track their allocations, while administrators can manage courses, monitor enrollments, and run automated allocation algorithms.

### 🎯 **Key Features**
- 📝 **Student Course Selection** - Interactive preference submission
- 🤖 **Automated Allocation Algorithm** - Smart course distribution system
- 👨‍💼 **Administrative Dashboard** - Complete system management
- 📊 **Real-time Analytics** - Enrollment tracking and reporting
- 🔐 **Secure Authentication** - Role-based access control
- 📱 **Responsive Design** - Works on all devices

---

## 🏗️ **System Architecture**

```
📦 Elective Course Management System
├── 🎨 Frontend (React + Vite)
│   ├── Student Portal
│   ├── Admin Dashboard
│   └── Responsive UI Components
├── ⚡ Backend (FastAPI + Python)
│   ├── REST API Endpoints
│   ├── Allocation Algorithm
│   └── Data Validation
└── 🗄️ Database (MongoDB)
    ├── Student Preferences
    ├── Course Catalog
    └── Allocation Results
```

---

## 👨‍🎓 **Student Side Features**

### 🔐 **Authentication & Profile**
- **Login System**: Secure student authentication
- **Profile Management**: View and update personal information
- **Dashboard**: Personalized overview of course status

### 📚 **Course Selection Process**

#### **1. Browse Available Courses** 📖
```
🔍 Course Categories:
├── 🧪 PECL1 Lab Courses (Choose 2)
│   ├── Image Processing Lab
│   ├── Natural Language Processing Lab
│   ├── IIOT Lab
│   ├── Innovative Product Development Lab-Phase1
│   └── Open-Source Intelligence Lab
├── 🧪 PECL2 Lab Courses (Choose 2)
│   ├── Social Media Analytics Lab
│   ├── Ethical Hacking Lab
│   ├── DevOps Lab
│   ├── Innovative Product Development Lab-Phase2
│   ├── Explainable AI Lab
│   └── Software Testing Lab
├── 💻 Program Electives (Choose 2)
│   ├── Blockchain Technology
│   ├── Deep Learning and Reinforcement Learning
│   ├── Cyber Security
│   ├── Big Data Analytics
│   ├── Computer Graphics
│   ├── HMI
│   └── Geographical Information Systems
├── 🌐 Open Electives (Choose 2)
│   ├── Advanced Microprocessor
│   ├── Internet of Things
│   ├── E-Vehicle
│   ├── Supply Chain Management
│   ├── Design of Experiments
│   └── 3D Printing
├── 🧠 MDM Courses (Choose 1)
│   ├── Emotional and Spiritual Intelligence
│   └── Health, Wellness and Psychology
├── 🏆 Honors Courses (Optional)
│   ├── IoT Honors
│   ├── AI/ML Honors
│   ├── Data Science Honors
│   ├── Blockchain Honors
│   └── Cybersecurity Honors
└── 🎯 Minor Courses (Optional)
    ├── Robotics Minor
    └── 3D Printing Minor
```

#### **2. Preference Submission** ✅
- **Two Choices Per Category**: Primary and backup preferences
- **Real-time Validation**: Instant feedback on selections
- **Progress Tracking**: Visual indicators of completion
- **Draft Saving**: Save progress and continue later

#### **3. Status Tracking** 📊
```
📈 Preference Status Flow:
Draft → Submitted → Under Review → Allocated → Confirmed
```

### 🎯 **Selection Rules & Guidelines**

#### **📋 Mandatory Requirements**
- ✅ **PECL1**: Must select 2 lab courses (1st and 2nd choice)
- ✅ **PECL2**: Must select 2 lab courses (1st and 2nd choice)
- ✅ **Program Elective**: Must select 2 courses (1st and 2nd choice)
- ✅ **Open Elective**: Must select 2 courses (1st and 2nd choice)
- ✅ **MDM**: Must select 1 course (mandatory)

#### **🎖️ Optional Choices**
- 🏆 **Honors OR Minor**: Can choose one or neither (mutually exclusive)
- 🚫 **Cannot select both** Honors and Minor simultaneously

#### **⚠️ Important Notes**
- 📅 **Submission Deadline**: Check academic calendar
- 🔄 **Modification Policy**: Changes allowed until deadline
- 📋 **Minimum Enrollment**: Courses need ≥20 students to run
- 🎲 **Allocation Priority**: First choice preferred, second choice if needed

---

## 👨‍💼 **Admin Side Features**

### 🎛️ **Administrative Dashboard**

#### **📊 System Overview**
- **Total Registrations**: Real-time student count
- **Submission Status**: Draft/Submitted/Confirmed breakdown
- **Course Popularity**: Live enrollment tracking
- **System Health**: Database and allocation status

#### **👥 Student Management**
```
📋 Student Operations:
├── 👀 View All Preferences
├── 📝 Edit Student Selections
├── 📊 Generate Student Reports
├── 📧 Send Notifications
└── 🔍 Search & Filter Students
```

#### **📚 Course Management**
```
🏗️ Course Operations:
├── ➕ Add New Courses
├── ✏️ Edit Course Details
├── 🗑️ Remove Courses
├── 📈 Set Enrollment Limits
├── 📋 Manage Prerequisites
└── 📊 Track Course Statistics
```

### 🤖 **Allocation Algorithm**

#### **🧮 Smart Distribution System**
The system uses an intelligent algorithm to allocate courses based on:

1. **📊 Preference Priority**: First choice gets highest priority
2. **⚖️ Fair Distribution**: Balanced enrollment across sections
3. **📋 Minimum Enrollment**: Ensures courses meet minimum requirements
4. **🔄 Reallocation Logic**: Handles underenrolled courses
5. **🚫 Constraint Enforcement**: Mutual exclusivity rules

#### **🔧 Allocation Process**
```
🔄 Allocation Workflow:
1. 📊 Collect Confirmed Preferences
2. 🧮 Run Allocation Algorithm
3. ⚠️ Handle Conflicts & Constraints
4. 📋 Generate Course Enrollments
5. 🚫 Cancel Underenrolled Courses
6. 🔄 Reallocate Affected Students
7. ✅ Finalize Allocations
8. 📧 Notify Students
```

#### **📈 Allocation Analytics**
- **Success Rate**: Percentage of students getting preferred courses
- **Course Fill Rate**: Enrollment vs capacity analysis
- **Reallocation Statistics**: Students moved to alternate choices
- **Issue Tracking**: Conflicts and resolution logs

### 📊 **Reporting & Analytics**

#### **📈 Real-time Dashboards**
- **Enrollment Trends**: Course popularity over time
- **Student Participation**: Submission rates and patterns
- **System Performance**: Allocation success metrics
- **Course Analytics**: Detailed course-wise statistics

#### **📋 Export Options**
- **📄 PDF Reports**: Comprehensive allocation summaries
- **📊 Excel Exports**: Detailed data for analysis
- **📧 Email Reports**: Automated system notifications
- **📱 Mobile Alerts**: Real-time status updates

---

## 🚀 **Technology Stack**

### 🎨 **Frontend**
- **⚛️ React 18**: Modern component-based UI
- **⚡ Vite**: Lightning-fast development server
- **🎨 Tailwind CSS**: Utility-first styling framework
- **🧭 React Router**: Client-side routing
- **📊 Chart.js**: Interactive data visualizations
- **🔔 React Hot Toast**: User notifications

### ⚡ **Backend**
- **🐍 Python 3.9+**: Core programming language
- **⚡ FastAPI**: High-performance API framework
- **🗄️ MongoDB**: NoSQL document database
- **📦 Beanie ODM**: Async MongoDB object document mapper
- **🔐 JWT Authentication**: Secure token-based auth
- **📊 Pydantic**: Data validation and serialization

### 📦 **Dependencies**
```json
{
  "frontend": {
    "react": "^18.2.0",
    "vite": "^4.4.5",
    "tailwindcss": "^3.3.0",
    "react-router-dom": "^6.15.0",
    "axios": "^1.5.0"
  },
  "backend": {
    "fastapi": "^0.103.0",
    "pymongo": "^4.5.0",
    "beanie": "^1.21.0",
    "pydantic": "^2.3.0",
    "uvicorn": "^0.23.0"
  }
}
```

---

## 📁 **Project Structure**

```
📦 Electives/
├── 🎨 Frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Reusable UI components
│   │   │   ├── student/         # Student-specific components
│   │   │   └── admin/           # Admin-specific components
│   │   ├── pages/
│   │   │   ├── student/         # Student portal pages
│   │   │   └── admin/           # Admin dashboard pages
│   │   ├── services/            # API integration
│   │   ├── hooks/               # Custom React hooks
│   │   └── utils/               # Helper functions
│   ├── package.json
│   └── vite.config.js
├── ⚡ Backend/
│   ├── app/
│   │   ├── api/                 # API route handlers
│   │   ├── db/                  # Database models & config
│   │   │   └── models.py        # MongoDB document models
│   │   ├── services/            # Business logic
│   │   │   └── allocation.py    # Course allocation algorithm
│   │   ├── core/                # Core configurations
│   │   └── main.py              # FastAPI application
│   ├── requirements.txt
│   └── .env
├── 🧪 Test Scenarios/
│   ├── test_standard.py         # Comprehensive test cases
│   └── test_runner.py           # Allocation testing utility
├── 📋 seed/
│   └── seed_students.py         # Sample data generation
└── 📚 README.md
```

---

## 🛠️ **Installation & Setup**

### 📋 **Prerequisites**
- **🐍 Python 3.9+**
- **📦 Node.js 16+**
- **🗄️ MongoDB 5.0+**
- **📝 Git**

### 🚀 **Quick Start**

#### **1. Clone Repository**
```bash
git clone https://github.com/Soham-droid-pixel/electives-system.git
cd electives-system
```

#### **2. Backend Setup**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Start MongoDB service
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# Run backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### **3. Frontend Setup**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### **4. Access Application**
- 🎓 **Student Portal**: http://localhost:5173
- 👨‍💼 **Admin Dashboard**: http://localhost:5173/admin
- 📊 **API Documentation**: http://localhost:8000/docs

---

## 🧪 **Testing**

### 📊 **Test Scenarios**
The system includes comprehensive test scenarios to validate allocation logic:

```bash
# Run all test scenarios
python test_scenarios/test_standard.py

# Test allocation algorithm
python test_scenarios/test_runner.py
```

#### **🎯 Test Cases**
1. **📈 Standard Distribution**: Normal enrollment patterns
2. **🔥 High Demand Courses**: Popular course oversubscription
3. **📉 Low Enrollment**: Minimum enrollment edge cases
4. **⚖️ Mutual Exclusivity**: Honors/Minor constraint testing
5. **🧪 Extreme Scenarios**: Stress testing allocation logic

---

## 📚 **API Documentation**

### 🔗 **Student Endpoints**
```
📝 Preference Management:
├── GET    /api/students/preferences     # Get student preferences
├── POST   /api/students/preferences     # Submit preferences
├── PUT    /api/students/preferences     # Update preferences
└── DELETE /api/students/preferences     # Clear preferences

📊 Course Information:
├── GET    /api/courses                  # List all courses
├── GET    /api/courses/{category}       # Get category courses
└── GET    /api/courses/{id}             # Get course details

🎯 Allocation Results:
├── GET    /api/students/allocation      # Get allocation results
└── GET    /api/students/status          # Get submission status
```

### 🔗 **Admin Endpoints**
```
👥 Student Management:
├── GET    /api/admin/students           # List all students
├── GET    /api/admin/students/{id}      # Get student details
├── PUT    /api/admin/students/{id}      # Update student info
└── DELETE /api/admin/students/{id}      # Remove student

📚 Course Management:
├── GET    /api/admin/courses            # Manage courses
├── POST   /api/admin/courses            # Add new course
├── PUT    /api/admin/courses/{id}       # Update course
└── DELETE /api/admin/courses/{id}       # Remove course

🤖 Allocation Management:
├── POST   /api/admin/allocate           # Run allocation
├── GET    /api/admin/allocations        # Get allocation history
├── GET    /api/admin/statistics         # System analytics
└── POST   /api/admin/notify             # Send notifications
```

---

## 🎯 **Business Rules**

### 📋 **Course Selection Rules**
1. **✅ Mandatory Categories**: Students must select from all 5 mandatory categories
2. **🔢 Choice Requirements**: Two choices per mandatory category (primary + backup)
3. **🧠 MDM Requirement**: Exactly one MDM course must be selected
4. **🚫 Mutual Exclusivity**: Cannot select both Honors and Minor
5. **📅 Deadline Compliance**: Submissions accepted until deadline only

### 🎲 **Allocation Algorithm Rules**
1. **📊 Priority System**: First choice gets priority over second choice
2. **📋 Minimum Enrollment**: Courses need ≥20 students (except Honors/Minor)
3. **🔄 Reallocation**: Students moved to second choice if first choice canceled
4. **⚖️ Fair Distribution**: Balanced enrollment across course sections
5. **🏆 Optional Courses**: Honors/Minor run regardless of enrollment

---

## 🛡️ **Security Features**

### 🔐 **Authentication & Authorization**
- **JWT Token-based Authentication**
- **Role-based Access Control** (Student/Admin)
- **Session Management**
- **Password Encryption**

### 🛡️ **Data Protection**
- **Input Validation & Sanitization**
- **SQL Injection Prevention**
- **XSS Protection**
- **CORS Configuration**
- **Rate Limiting**

---

## 📊 **Performance & Scalability**

### ⚡ **Optimization Features**
- **Async/Await Architecture**: Non-blocking operations
- **Database Indexing**: Optimized query performance
- **Caching Strategy**: Reduced database load
- **Lazy Loading**: On-demand resource loading
- **Compression**: Optimized data transfer

### 📈 **Scalability Considerations**
- **Horizontal Scaling**: Multiple server instances
- **Database Sharding**: Distributed data storage
- **Load Balancing**: Traffic distribution
- **CDN Integration**: Static asset delivery

---

## 🐛 **Troubleshooting**

### 🔧 **Common Issues**

#### **❌ MongoDB Connection Failed**
```bash
# Check MongoDB service status
# Windows: sc query MongoDB
# macOS: brew services list | grep mongodb
# Linux: sudo systemctl status mongod

# Restart MongoDB service if needed
# Windows: net restart MongoDB
# macOS: brew services restart mongodb-community
# Linux: sudo systemctl restart mongod
```

#### **❌ Port Already in Use**
```bash
# Find and kill process using port
# Windows: netstat -ano | findstr :8000 & taskkill /PID <PID> /F
# macOS/Linux: lsof -ti:8000 | xargs kill -9
```

#### **❌ Allocation Algorithm Issues**
```bash
# Run diagnostic tests
python test_scenarios/test_runner.py

# Check allocation logs
tail -f logs/allocation.log
```

---

## 📞 **Support & Contact**

### 🎓 **Fr. Conceicao Rodrigues College of Engineering**
- 📍 **Address**: Bandra West, Mumbai, Maharashtra, India
- 📧 **Email**: principal@frcrce.ac.in
- 📞 **Phone**: +91 22 2640 4971
- 🌐 **Website**: [https://frcrce.ac.in](https://frcrce.ac.in)

### 👨‍💻 **Technical Support**
- 📧 **Developer Email**: support@frcrce.ac.in
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Soham-droid-pixel/electives-system/issues)
- 📚 **Documentation**: [GitHub Wiki](https://github.com/Soham-droid-pixel/electives-system/wiki)
- 💬 **Community**: [Discord Server](https://discord.gg/your-server)

---

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- 🎓 **Fr. Conceicao Rodrigues College of Engineering** - For project requirements and guidance
- 👨‍🏫 **Faculty Members** - For domain expertise and feedback
- 👨‍🎓 **Students** - For testing and user experience feedback
- 🌟 **Open Source Community** - For the amazing tools and libraries

---

## 🚀 **Future Enhancements**

### 📅 **Planned Features**
- 📱 **Mobile App**: Native iOS/Android applications
- 🔔 **Push Notifications**: Real-time updates
- 📊 **Advanced Analytics**: ML-powered insights
- 🌐 **Multi-language Support**: Hindi, Marathi language options
- 🎯 **Smart Recommendations**: AI-based course suggestions
- 📧 **Email Integration**: Automated communications
- 📱 **SMS Notifications**: Mobile alerts
- 🔄 **API Versioning**: Backward compatibility

### 🎨 **UI/UX Improvements**
- 🌙 **Dark Mode**: Theme customization
- ♿ **Accessibility**: WCAG compliance
- 📱 **Progressive Web App**: Offline functionality
- 🎭 **Animations**: Enhanced user experience

---

<div align="center">

## 🎉 **Ready to Get Started?**

**[📥 Download](https://github.com/your-username/electives-system/archive/main.zip)** • **[🚀 Deploy](https://github.com/your-username/electives-system#installation--setup)** • **[📚 Documentation](https://github.com/your-username/electives-system/wiki)**

---

**Built with ❤️ by the FRCRCE Development Team**

**🎓 Empowering Education Through Technology 🎓**

</div>