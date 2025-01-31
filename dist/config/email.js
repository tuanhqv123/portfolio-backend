import nodemailer from "nodemailer";
export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
export const sendWelcomeEmail = async (email, username) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #c15f3c;">Welcome to Our Portfolio!</h1>
      <p>Dear ${username},</p>
      <p>Thank you for joining our community! We're excited to have you on board.</p>
      <p>Feel free to explore our projects and reach out if you have any questions.</p>
      <p>Best regards,<br>The Portfolio Team</p>
    </div>
  `;
    await transporter.sendMail({
        from: `"Portfolio Team" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome to Our Portfolio!",
        html,
    });
};
