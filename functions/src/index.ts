import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

admin.initializeApp();

// Create reusable transporter object using SMTP
const createTransporter = (): nodemailer.Transporter => {
  // Get email config from environment variables
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log("Creating email transporter with config:", { 
    user: user ? "configured" : "missing",
    pass: pass ? "configured" : "missing",
    host: "smtp.gmail.com",
    port: 587,
    timestamp: new Date().toISOString()
  });

  if (!user || !pass) {
    throw new Error(
      "Email configuration is missing. Please check your environment variables."
    );
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use TLS
    auth: { user, pass },
    debug: true, // Enable debug logs
    logger: true, // Enable logger
    tls: {
      rejectUnauthorized: false // Only for development!
    }
  });

  return transporter;
};

// Verify transporter connection on function initialization
let transporter: nodemailer.Transporter;
try {
  console.log("Initializing email transporter...", {
    timestamp: new Date().toISOString()
  });
  transporter = createTransporter();
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP connection error:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        code: error.code,
        command: error.command,
        response: error.response,
        transporterConfig: transporter?.transporter?.options,
        timestamp: new Date().toISOString()
      });
      throw error;
    } else {
      console.log("SMTP server is ready to take messages", {
        timestamp: new Date().toISOString()
      });
    }
  });
} catch (error) {
  console.error("Failed to create email transporter:", {
    error,
    stack: error instanceof Error ? error.stack : undefined,
    config: process.env,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
  throw error;
}

// Helper function to send email with detailed logging
async function sendEmail(mailOptions: nodemailer.SendMailOptions): Promise<nodemailer.SentMessageInfo> {
  console.log("Attempting to send email:", {
    to: mailOptions.to,
    subject: mailOptions.subject,
    from: mailOptions.from,
    transporterReady: !!transporter,
    transporterConfig: transporter?.transporter?.options,
    timestamp: new Date().toISOString()
  });

  try {
    if (!transporter) {
      console.log("Recreating transporter as it was not initialized...", {
        timestamp: new Date().toISOString()
      });
      transporter = createTransporter();
    }

    // Test connection before sending
    await new Promise((resolve, reject) => {
      transporter.verify((error) => {
        if (error) {
          console.error("Pre-send verification failed:", {
            error,
            code: error.code,
            command: error.command,
            response: error.response,
            timestamp: new Date().toISOString()
          });
          reject(error);
        } else {
          resolve(true);
        }
      });
    });

    const info = await transporter.sendMail({
      ...mailOptions,
      from: mailOptions.from || '"HappyPipeline" <noreply@happypipeline.com>'
    });
    
    console.log("Email sent successfully:", {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      envelope: info.envelope,
      pending: info.pending,
      transporterState: transporter.isIdle(),
      timestamp: new Date().toISOString()
    });
    
    return info;
  } catch (error) {
    console.error("Error sending email:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      code: error.code,
      command: error.command,
      response: error.response,
      transporterState: transporter?.isIdle(),
      timestamp: new Date().toISOString(),
      mailOptions: {
        to: mailOptions.to,
        subject: mailOptions.subject,
        from: mailOptions.from
      }
    });
    throw new functions.https.HttpsError("internal", "Failed to send email", error);
  }
}

// Send email when a new lead is created
export const onLeadCreated = functions.firestore
  .document("leads/{leadId}")
  .onCreate(async (snap, context) => {
    const lead = snap.data() as Lead;
    lead.id = context.params.leadId;

    try {
      console.log("Processing new lead:", {
        leadId: lead.id,
        email: lead.email,
        birddogId: lead.birddogId,
        timestamp: new Date().toISOString()
      });

      // Get birddog info
      const birddogDoc = await admin.firestore()
        .collection("users")
        .doc(lead.birddogId)
        .get();
      const birddog = birddogDoc.data();

      if (!birddog?.email) {
        console.error("Birddog email not found:", {
          birddogId: lead.birddogId,
          birddogData: birddog,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Birddog email not found for ID: ${lead.birddogId}`);
      }

      console.log("Preparing to send emails for lead:", {
        leadId: lead.id,
        birddogEmail: birddog.email,
        leadEmail: lead.email,
        timestamp: new Date().toISOString()
      });

      // Email to birddog confirming lead submission
      const birddogMailOptions = {
        from: '"HappyPipeline" <noreply@happypipeline.com>',
        to: birddog.email,
        subject: "Lead Submission Confirmation",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">Lead Submission Confirmation</h2>
            <p>Your lead for ${lead.firstName} ${lead.lastName} has been successfully submitted.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0f172a; margin-top: 0;">Lead Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin-bottom: 10px;">📍 <strong>Address:</strong> ${lead.address}</li>
                <li style="margin-bottom: 10px;">🏷️ <strong>Types:</strong> ${lead.types.join(", ")}</li>
                <li style="margin-bottom: 10px;">📊 <strong>Status:</strong> Pending Assignment</li>
              </ul>
            </div>
            <p style="color: #64748b; font-size: 14px;">
              You'll receive updates as this lead progresses through the pipeline.
            </p>
          </div>
        `
      };

      // Email to the lead
      const leadMailOptions = {
        from: '"HappyPipeline" <noreply@happypipeline.com>',
        to: lead.email,
        subject: "Welcome to HappyPipeline",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">Welcome to HappyPipeline</h2>
            <p>Dear ${lead.firstName},</p>
            <p>Thank you for choosing HappyPipeline. We've received your information and our team will be in touch shortly.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0f172a; margin-top: 0;">Your Request Details:</h3>
              <p>Services requested: ${lead.types.map(type => 
                type.charAt(0).toUpperCase() + type.slice(1)).join(", ")}</p>
            </div>
            <p>We'll keep you updated on the progress of your request. If you have any questions in the meantime, please don't hesitate to reach out.</p>
            <p style="color: #64748b; font-size: 14px;">
              The HappyPipeline Team
            </p>
          </div>
        `
      };

      // Send both emails
      console.log("Sending emails...", {
        timestamp: new Date().toISOString()
      });
      
      const emailResults = await Promise.allSettled([
        
        sendEmail(birddogMailOptions),
        sendEmail(leadMailOptions)
      ]);

      // Log results
      console.log("Email sending results:", {
        birddogEmail: emailResults[0].status === 'fulfilled' ? 'sent' : 'failed',
        leadEmail: emailResults[1].status === 'fulfilled' ? 'sent' : 'failed',
        errors: emailResults.map(result => 
          result.status === 'rejected' ? result.reason : null
        ).filter(Boolean),
        timestamp: new Date().toISOString()
      });

      // Update lead document with email status
      const leadRef = doc(admin.firestore(), 'leads', lead.id);
      await updateDoc(leadRef, {
        emailStatus: {
          birddogEmail: emailResults[0].status === 'fulfilled',
          leadEmail: emailResults[1].status === 'fulfilled',
          timestamp: new Date().toISOString()
        }
      });

      console.log("All processing completed for lead:", {
        leadId: lead.id,
        timestamp: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error processing lead creation:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        lead: {
          id: lead.id,
          email: lead.email,
          birddogId: lead.birddogId
        },
        timestamp: new Date().toISOString()
      });
      throw new functions.https.HttpsError("internal", "Failed to process lead creation", error);
    }
  });