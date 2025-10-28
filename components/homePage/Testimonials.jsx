import React from 'react';

const testimonialData = [
    {
        stars: '★★★★★',
        content:
            "ClaimKing.AI increased our supplement approval rate by 89%. We're adding an extra $180K per month in previously missed items.",
        avatar: 'JD',
        name: 'Jake Davis',
        title: 'Owner, Davis Roofing LLC',
    },
    {
        stars: '★★★★★',
        content:
            "The AI call center alone pays for the entire platform. We haven't missed a storm lead since we started using ClaimKing.",
        avatar: 'SM',
        name: 'Sarah Martinez',
        title: 'CEO, StormGuard Restoration',
    },
    {
        stars: '★★★★★',
        content:
            "3D mockups close deals. Period. Our conversion rate went from 22% to 61% just by showing homeowners what's possible.",
        avatar: 'RT',
        name: 'Robert Thompson',
        title: 'President, Premier Roofing',
    },
];

const Testimonials = () => {
    return (
        <section className="testimonials" id="testimonials">
            <div className="section-header">
                <h2 className="section-title">Trusted by 500+ Roofing Contractors</h2>
                <p className="section-subtitle">See why contractors are switching to ClaimKing.AI</p>
            </div>

            <div className="testimonial-grid">
                {testimonialData.map((testimonial, index) => (
                    <div key={index} className="testimonial-card">
                        <div className="testimonial-stars">{testimonial.stars}</div>
                        <p className="testimonial-content">{testimonial.content}</p>
                        <div className="testimonial-author">
                            <div className="author-avatar">{testimonial.avatar}</div>
                            <div className="author-info">
                                <div className="author-name">{testimonial.name}</div>
                                <div className="author-title">{testimonial.title}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Testimonials;
