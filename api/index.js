const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { authenticateUser } = require('./middleware/auth');
const scheduleNotifications = require('./utils/notifications');

dotenv.config();
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
  credentials: true 
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());

// API Documentation route
app.get('/', (req, res) => {
  res.json({
    name: "Todo API",
    version: "1.0.0",
    description: "RESTful API for Todo Application",
    endpoints: {
      auth: {
        register: {
          method: "POST",
          path: "/api/auth/register",
          body: {
            email: "string (required)",
            password: "string (required)"
          },
          description: "Register a new user"
        },
        login: {
          method: "POST",
          path: "/api/auth/login",
          body: {
            email: "string (required)",
            password: "string (required)"
          },
          description: "Login to get JWT token"
        }
      },
      tasks: {
        create: {
          method: "POST",
          path: "/api/tasks",
          auth: "Bearer token required",
          body: {
            title: "string (required)",
            description: "string (optional)",
            dueDate: "Date (optional)",
            priority: "string (Low/Medium/High)",
            status: "string (Pending/In Progress/Completed)"
          },
          description: "Create a new task"
        },
        getAll: {
          method: "GET",
          path: "/api/tasks",
          auth: "Bearer token required",
          query: {
            status: "string (optional) - Filter by status",
            sortBy: "string (optional) - Sort by dueDate/createdAt/priority",
            q: "string (optional) - Search in title and description"
          },
          description: "Get all tasks with optional filtering and sorting"
        },
        update: {
          method: "PUT",
          path: "/api/tasks/:id",
          auth: "Bearer token required",
          body: "Same as create task (all fields optional)",
          description: "Update an existing task"
        },
        delete: {
          method: "DELETE",
          path: "/api/tasks/:id",
          auth: "Bearer token required",
          description: "Delete a task"
        }
      },
      health: {
        method: "GET",
        path: "/api/health",
        description: "Check API health status"
      }
    },
    examples: {
      register: {
        request: {
          method: "POST",
          url: "/api/auth/register",
          body: {
            email: "user@example.com",
            password: "securepassword123"
          }
        }
      },
      createTask: {
        request: {
          method: "POST",
          url: "/api/tasks",
          headers: {
            "Authorization": "Bearer your_jwt_token"
          },
          body: {
            title: "Complete Project",
            description: "Finish the todo app project",
            dueDate: "2024-03-20",
            priority: "High",
            status: "In Progress"
          }
        }
      }
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', authenticateUser, taskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app')
  .then(() => {
    console.log('MongoDB connected');
    scheduleNotifications();
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => console.error('DB connection error:', err));

// Export app for Vercel
module.exports = app;
