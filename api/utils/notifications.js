const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Task = require('../models/Task');
const User = require('../models/User');

// Create transporter outside the function to reuse it
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendNotification(userEmail, task) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `Todo Reminder: ${task.title}`,
      html: `
        <h2>Task Due Tomorrow</h2>
        <p>Your task "${task.title}" is due on ${new Date(task.dueDate).toLocaleDateString()}.</p>
        <h3>Task Details:</h3>
        <ul>
          <li><strong>Description:</strong> ${task.description || 'No description'}</li>
          <li><strong>Priority:</strong> ${task.priority}</li>
          <li><strong>Status:</strong> ${task.status}</li>
        </ul>
        <p>Please complete the task before the due date.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${userEmail} for task '${task.title}'`);
  } catch (error) {
    console.error('Failed to send notification email:', error);
  }
}

function scheduleNotifications() {
  // Run daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      const upcoming = new Date();
      upcoming.setDate(upcoming.getDate() + 1);
      upcoming.setHours(23, 59, 59, 999);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tasks = await Task.find({
        dueDate: { 
          $gte: today,
          $lte: upcoming 
        },
        status: { $ne: 'Completed' },
      }).populate('userId');

      for (const task of tasks) {
        const user = task.userId;
        if (user?.email) {
          await sendNotification(user.email, task);
        }
      }
    } catch (error) {
      console.error('Error in notification scheduler:', error);
    }
  });
}

module.exports = scheduleNotifications;
