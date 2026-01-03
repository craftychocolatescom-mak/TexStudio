
import React, { useState } from 'react';

interface SubscriptionPageProps {
    userId: string;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ userId }) => {
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/stripe-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: 'price_1234567890', // Replace with real Stripe Price ID
                    userId: userId,
                    successUrl: window.location.origin + '?session_id={CHECKOUT_SESSION_ID}',
                    cancelUrl: window.location.origin,
                }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error(error);
            alert('Checkout initialization failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto text-white">
            <div className="text-center space-y-4 mb-16">
                <h2 className="text-4xl font-black tracking-tighter">Upgrade to Pro Studio</h2>
                <p className="text-slate-400">Unlock high-resolution synthesis and unlimited project history.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Free Tier */}
                <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-6 opacity-60">
                    <h3 className="text-2xl font-black">Starter</h3>
                    <p className="text-4xl font-black">$0</p>
                    <ul className="space-y-3 text-sm font-medium text-slate-400">
                        <li className="flex items-center gap-2"><i className="fas fa-check text-slate-600"></i> Limited Synthesis</li>
                        <li className="flex items-center gap-2"><i className="fas fa-check text-slate-600"></i> Low-Res Exports</li>
                        <li className="flex items-center gap-2"><i className="fas fa-check text-slate-600"></i> 1 Active Project</li>
                    </ul>
                    <button disabled className="w-full py-4 bg-slate-800 rounded-xl font-black uppercase text-xs">Current Plan</button>
                </div>

                {/* Pro Tier */}
                <div className="bg-slate-900 border-2 border-indigo-500 rounded-[32px] p-8 space-y-6 relative overflow-hidden shadow-2xl shadow-indigo-600/20">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest">Recommended</div>
                    <h3 className="text-2xl font-black text-indigo-400">Pro Studio</h3>
                    <p className="text-4xl font-black text-white">$29<span className="text-lg text-slate-500 font-medium">/mo</span></p>
                    <ul className="space-y-3 text-sm font-medium text-slate-300">
                        <li className="flex items-center gap-2"><i className="fas fa-check text-indigo-400"></i> Unlimited Projects</li>
                        <li className="flex items-center gap-2"><i className="fas fa-check text-indigo-400"></i> 4K Technical Renders</li>
                        <li className="flex items-center gap-2"><i className="fas fa-check text-indigo-400"></i> Full Pattern Grading</li>
                        <li className="flex items-center gap-2"><i className="fas fa-check text-indigo-400"></i> Priority GPU Access</li>
                    </ul>
                    <button onClick={handleSubscribe} disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all">
                        {loading ? 'Processing...' : 'Unlock Pro access'}
                    </button>
                </div>
            </div>
        </div>
    );
};
