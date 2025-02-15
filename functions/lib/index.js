"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReferralInviteDeleted = exports.sendReferralReminder = exports.onLeadCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
admin.initializeApp();
// Create reusable transporter object using SMTP
const createTransporter = () => {
    var _a, _b;
    const user = (_a = functions.config().email) === null || _a === void 0 ? void 0 : _a.user;
    const pass = (_b = functions.config().email) === null || _b === void 0 ? void 0 : _b.pass;
    console.log('Creating email transporter with config:', {
        user: user ? 'configured' : 'missing',
        pass: pass ? 'configured' : 'missing'
    });
    if (!user || !pass) {
        throw new Error('Email configuration is missing. Please set email.user and email.pass in Firebase Functions config.');
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
let transporter;
try {
    console.log('Initializing email transporter...');
    transporter = createTransporter();
    transporter.verify((error) => {
        if (error) {
            console.error('SMTP connection error:', error);
            throw error;
        }
        else {
            console.log('SMTP server is ready to take messages');
        }
    });
}
catch (error) {
    console.error('Failed to create email transporter:', error);
    throw error;
}
// Helper function to send email with detailed logging
async function sendEmail(mailOptions) {
    console.log('Attempting to send email:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        from: mailOptions.from
    });
    try {
        const info = await transporter.sendMail(Object.assign(Object.assign({}, mailOptions), { from: mailOptions.from || '"HappyPipeline" <noreply@happypipeline.com>' }));
        console.log('Email sent successfully:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
            envelope: info.envelope
        });
        return info;
    }
    catch (error) {
        console.error('Error sending email:', {
            error,
            stack: error instanceof Error ? error.stack : undefined,
            mailOptions: {
                to: mailOptions.to,
                subject: mailOptions.subject,
                from: mailOptions.from
            }
        });
        throw new functions.https.HttpsError('internal', 'Failed to send email', error);
    }
}
// Send email when a new lead is created
exports.onLeadCreated = functions.firestore
    .document("leads/{leadId}")
    .onCreate(async (snap, context) => {
    const lead = snap.data();
    lead.id = context.params.leadId;
    try {
        console.log('Processing new lead:', {
            leadId: lead.id,
            email: lead.email,
            birddogId: lead.birddogId
        });
        // Get birddog info
        const birddogDoc = await admin.firestore().collection("users").doc(lead.birddogId).get();
        const birddog = birddogDoc.data();
        if (!(birddog === null || birddog === void 0 ? void 0 : birddog.email)) {
            console.error('Birddog email not found:', {
                birddogId: lead.birddogId,
                birddogData: birddog
            });
            throw new Error(`Birddog email not found for ID: ${lead.birddogId}`);
        }
        console.log('Preparing to send emails for lead:', {
            leadId: lead.id,
            birddogEmail: birddog.email,
            leadEmail: lead.email
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
              <p>Services requested: ${lead.types.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(", ")}</p>
            </div>
            <p>We'll keep you updated on the progress of your request. If you have any questions in the meantime, please don't hesitate to reach out.</p>
            <p style="color: #64748b; font-size: 14px;">
              The HappyPipeline Team
            </p>
          </div>
        `
        };
        // Send both emails
        console.log('Sending emails...');
        await Promise.all([
            sendEmail(birddogMailOptions),
            sendEmail(leadMailOptions)
        ]);
        console.log('All emails sent successfully for lead:', lead.id);
        return { success: true };
    }
    catch (error) {
        console.error("Error processing lead creation:", {
            error,
            stack: error instanceof Error ? error.stack : undefined,
            lead: {
                id: lead.id,
                email: lead.email,
                birddogId: lead.birddogId
            }
        });
        throw new functions.https.HttpsError('internal', 'Failed to process lead creation', error);
    }
});
// Send reminder email for pending invites
exports.sendReferralReminder = functions.firestore
    .document("referral_relationships/{relationshipId}")
    .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    // Only send reminder if lastReminderSent was updated
    if (newData.lastReminderSent === previousData.lastReminderSent) {
        return null;
    }
    console.log('Processing referral reminder:', context.params.relationshipId);
    try {
        await sendEmail({
            from: '"HappyPipeline" <noreply@happypipeline.com>',
            to: newData.email,
            subject: "Reminder: Join Our Referral Network",
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">Your Invitation is Waiting</h2>
            <p>Hello ${newData.firstName},</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p>This is a friendly reminder that you have been invited to join our referral network as a ${newData.type}.</p>
              <p>Join now to start earning commissions and growing your network!</p>
            </div>
            <p>If you have any questions, please don't hesitate to reach out.</p>
            <p style="color: #64748b; font-size: 14px;">
              The HappyPipeline Team
            </p>
          </div>
        `
        });
        console.log('Reminder email sent successfully for relationship:', context.params.relationshipId);
        return { success: true };
    }
    catch (error) {
        console.error("Error sending reminder email:", error);
        throw new functions.https.HttpsError('internal', 'Failed to send reminder email', error);
    }
});
// Clean up related data when an invite is deleted
exports.onReferralInviteDeleted = functions.firestore
    .document("referral_relationships/{relationshipId}")
    .onDelete(async (snapshot, context) => {
    const deletedData = snapshot.data();
    console.log('Processing deleted invite:', context.params.relationshipId);
    try {
        await sendEmail({
            from: '"HappyPipeline" <noreply@happypipeline.com>',
            to: deletedData.email,
            subject: "Referral Invitation Update",
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">Referral Invitation Update</h2>
            <p>Hello ${deletedData.firstName},</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p>The referral invitation you received has been cancelled.</p>
              <p>If you're still interested in joining our network, please reach out to get a new invitation.</p>
            </div>
            <p style="color: #64748b; font-size: 14px;">
              The HappyPipeline Team
            </p>
          </div>
        `
        });
        console.log('Cancellation email sent successfully for relationship:', context.params.relationshipId);
        return { success: true };
    }
    catch (error) {
        console.error("Error handling deleted invite:", error);
        throw new functions.https.HttpsError('internal', 'Failed to process deleted invite', error);
    }
});
//# sourceMappingURL=index.js.map