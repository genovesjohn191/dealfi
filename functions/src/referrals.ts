import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Helper function to calculate commission rate based on level
// function calculateCommissionRate(level: number): number {
//   const rates: { [key: number]: number } = {
//     1: 0.10,  // 10% for direct referrals
//     2: 0.05,  // 5% for second level
//     3: 0.03,  // 3% for third level
//     4: 0.02,  // 2% for fourth level
//     5: 0.015, // 1.5% for fifth level
//     6: 0.01,  // 1% for sixth level
//     7: 0.005  // 0.5% for seventh level
//   };
//   return rates[level] || 0;
// }

// Create a referral relationship
export const createReferralRelationship = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { referredEmail } = data;
  // const referrerId = context.auth.uid;

  try {
    // Get referred user by email
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('email', '==', referredEmail)
      .get();

    if (usersSnapshot.empty) {
      throw new functions.https.HttpsError('not-found', 'Referred user not found');
    }

    // Additional logic to create referral relationship
    // ...
    
  } catch (error) {
    throw new functions.https.HttpsError('unknown', 'An error occurred', error);
  }
});
