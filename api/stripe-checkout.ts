
import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { supabase } from '../services/supabaseClient'; // Ensure this runs in node context or use separate admin client

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { priceId, successUrl, cancelUrl, userId } = req.body;

    try {
        // 1. Get or create Stripe Customer
        // NOTE: This uses the service role key ideally, or we ensure the user is auth'd
        // For simplicity, we assume the client passes the UUID and we trust it (secured by RLS/Auth middleware in production)

        // Create Session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: userId,
            // metadata: { userId },
        });

        res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
