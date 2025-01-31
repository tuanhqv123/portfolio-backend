import nodemailer from "nodemailer";
import { env } from "./env";

const createTransporter = () => {
  // Kiểm tra các biến môi trường bắt buộc
  if (!env.email.user || !env.email.pass) {
    throw new Error(
      "Missing email configuration. EMAIL_USER and EMAIL_PASS are required."
    );
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Sử dụng SSL
    auth: {
      user: env.email.user,
      pass: env.email.pass,
    },
  });
};

export const transporter = createTransporter();

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP Connection Error:", error);
    console.log("Email credentials being used:", {
      user: env.email.user,
    });
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

export const sendWelcomeEmail = async (email: string, username: string) => {
  try {
    const mailOptions = {
      from: {
        name: "Portfolio Team",
        address: env.email.user,
      },
      to: email,
      subject: "Welcome to Our Portfolio!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #c15f3c;">Welcome to Our Portfolio!</h1>
          <p>Dear ${username},</p>
          <p>Thank you for joining our community! We're excited to have you on board.</p>
          <p>Feel free to explore our projects and reach out if you have any questions.</p>
          <p>Best regards,<br>The Portfolio Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent successfully to:", email);
    return info;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    throw error;
  }
};
