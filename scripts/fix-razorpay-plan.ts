
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

async function checkAndCreatePlan() {
  const BASE_PLAN_ID = process.env.RAZORPAY_BASE_PLAN_ID || 'plan_base_monthly';
  console.log(`Checking Razorpay plan: ${BASE_PLAN_ID}`);

  try {
    const plan = await razorpay.plans.fetch(BASE_PLAN_ID);
    console.log('Plan exists:', plan);
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log('Plan not found. Attempting to create a ₹0 base plan...');
      try {
        const newPlan = await razorpay.plans.create({
          period: 'monthly',
          interval: 1,
          item: {
            name: 'Roombox Base Plan',
            amount: 0,
            currency: 'INR',
            description: 'Anchor plan for monthly billing'
          }
        });
        console.log('SUCCESS: Created new plan:', newPlan);
        console.log(`IMPORTANT: Add this to your .env file: RAZORPAY_BASE_PLAN_ID=${newPlan.id}`);
      } catch (createError: any) {
        console.error('FAILED to create plan:', createError.error || createError);
        if (createError.error && createError.error.description.includes('amount')) {
            console.log('Razorpay might not allow ₹0 plans in some accounts. Trying ₹1...');
             const nextPlan = await razorpay.plans.create({
              period: 'monthly',
              interval: 1,
              item: {
                name: 'Roombox Base Plan',
                amount: 100, // ₹1.00 (in paise)
                currency: 'INR',
                description: 'Anchor plan for monthly billing'
              }
            });
             console.log('SUCCESS: Created ₹1 plan:', nextPlan);
             console.log(`IMPORTANT: Add this to your .env file: RAZORPAY_BASE_PLAN_ID=${nextPlan.id}`);
        }
      }
    } else {
      console.error('Error fetching plan:', error);
    }
  }
}

checkAndCreatePlan();
