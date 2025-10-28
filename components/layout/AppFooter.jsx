'use client'
import {usePathname} from "next/navigation";

const AppFooter = () => {
    const pathname = usePathname();
    if (pathname.startsWith("/dashboard")){
        return null
    }
    return (
        <div>
            <footer className="footer">
                <div className="footer-container">
                    <div className="footer-column">
                        <h3>Product</h3>
                        <a href="#" className="footer-link">Features</a>
                        <a href="#" className="footer-link">Pricing</a>
                        <a href="#" className="footer-link">Integrations</a>
                        <a href="#" className="footer-link">API</a>
                    </div>
                    <div className="footer-column">
                        <h3>Company</h3>
                        <a href="#" className="footer-link">About</a>
                        <a href="#" className="footer-link">Careers</a>
                        <a href="#" className="footer-link">Partners</a>
                        <a href="#" className="footer-link">Contact</a>
                    </div>
                    <div className="footer-column">
                        <h3>Resources</h3>
                        <a href="#" className="footer-link">Documentation</a>
                        <a href="#" className="footer-link">Blog</a>
                        <a href="#" className="footer-link">Webinars</a>
                        <a href="#" className="footer-link">Support</a>
                    </div>
                    <div className="footer-column">
                        <h3>Legal</h3>
                        <a href="#" className="footer-link">Privacy Policy</a>
                        <a href="#" className="footer-link">Terms of Service</a>
                        <a href="#" className="footer-link">Security</a>
                        <a href="#" className="footer-link">Compliance</a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2024 ClaimKing.AI. All rights reserved. | Built for roofers, by roofers.</p>
                </div>
            </footer>
        </div>
    );
};

export default AppFooter;