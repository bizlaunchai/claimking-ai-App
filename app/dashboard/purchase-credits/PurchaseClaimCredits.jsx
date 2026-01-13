"use client";
import "./purchase-credits.css"
import {useEffect, useRef, useState} from "react";

const BuyCreditsPage = () => {

    const couponCodes = {
        'NEWCUSTOMER': { discount: 0.20, type: 'percentage', description: 'New customer discount' },
        'SAVE20': { discount: 0.20, type: 'percentage', description: '20% off' },
        'BULK50': { discount: 50, type: 'fixed', description: '$50 off', minCredits: 10 },
        'HOLIDAY25': { discount: 0.25, type: 'percentage', description: 'Holiday special' },
        'WELCOME10': { discount: 0.10, type: 'percentage', description: 'Welcome discount' },
        'REFER100': { discount: 100, type: 'fixed', description: '$100 referral credit', minCredits: 5 }
    };
        const [creditBalance, setCreditBalance] = useState(23);
        let [appliedCoupon, setAppliedCoupon] = useState(null);
        let [originalTotal, setOriginalTotal] = useState(0);
        const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
        const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
        const [currentPackage, setCurrentPackage] = useState({ credits: 0, total: 0 });
        const [isCouponOpen, setIsCouponOpen] = useState(false);
        const [couponMessage, setCouponMessage] = useState('');
        const [couponMessageType, setCouponMessageType] = useState('');
        const [couponCode, setCouponCode] = useState('');
        const [customAmount, setCustomAmount] = useState('');
        const [calculationResult, setCalculationResult] = useState(null);
        const [isAutoRechargeEnabled, setIsAutoRechargeEnabled] = useState(false);
        const [rechargeThreshold, setRechargeThreshold] = useState(10);
        const [rechargeAmount, setRechargeAmount] = useState(10);
        const [monthlySubscription, setMonthlySubscription] = useState('0');

        const couponCodeRef = useRef(null);
        const customAmountRef = useRef(null);
        const paymentModalRef = useRef(null);

        // Check balance on load
        useEffect(() => {
            checkBalance();
            updateRechargeExample();
            setupPaymentForm();
        }, []);

        useEffect(() => {
            updateRechargeExample();
        }, [rechargeThreshold, rechargeAmount]);

        const checkBalance = () => {
            // Show warning if under 50 credits
            const warning = document.getElementById('lowBalanceWarning');
            const meter = document.querySelector('.balance-fill');

            if (creditBalance < 50) {
                if (warning) warning.style.display = 'flex';
            } else {
                if (warning) warning.style.display = 'none';
            }

            // Update meter (assuming max display is 100)
            if (meter) {
                meter.style.width = Math.min(creditBalance, 100) + '%';
            }
        };

        // Coupon Functions
        const toggleCoupon = () => {
            setIsCouponOpen(!isCouponOpen);
            if (!isCouponOpen && couponCodeRef.current) {
                couponCodeRef.current.focus();
            }
        };

        const applyCoupon = () => {
            const code = couponCode.trim().toUpperCase();

            if (!code) {
                showCouponMessage('Please enter a promo code', 'error');
                return;
            }

            const coupon = couponCodes[code];

            if (!coupon) {
                showCouponMessage('Invalid promo code', 'error');
                return;
            }

            // Check minimum credits requirement
            if (coupon.minCredits && currentPackage.credits < coupon.minCredits) {
                showCouponMessage(`This code requires minimum ${coupon.minCredits} credits`, 'error');
                return;
            }

            // Apply coupon
            setAppliedCoupon({ ...coupon, code });
            updatePriceWithCoupon();

            // Show success
            showCouponMessage('Promo code applied!', 'success');
            setIsCouponOpen(false);
        };

        const removeCoupon = () => {
            setAppliedCoupon(null);
            setCouponCode('');
            setCouponMessage('');
            updatePriceWithCoupon();
        };

        const updatePriceWithCoupon = () => {
            if (!originalTotal) {
                const totalElement = document.getElementById('modalTotal');
                if (totalElement) {
                    setOriginalTotal(parseFloat(totalElement.textContent.replace(/[$,]/g, '')));
                }
                return;
            }

            let finalTotal = originalTotal;
            let discountAmount = 0;

            if (appliedCoupon) {
                if (appliedCoupon.type === 'percentage') {
                    discountAmount = originalTotal * appliedCoupon.discount;
                } else {
                    discountAmount = Math.min(appliedCoupon.discount, originalTotal);
                }

                finalTotal = originalTotal - discountAmount;
            }

            // Update BNPL amounts would happen here in a real implementation
        };

        const showCouponMessage = (text, type) => {
            setCouponMessage(text);
            setCouponMessageType(type);
        };

        const copyPromoCode = (code) => {
            navigator.clipboard.writeText(code);
            const btn = document.querySelector('.promo-copy-btn');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.background = 'var(--success)';

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            }
        };

        const closePromoBanner = () => {
            const banner = document.getElementById('promoBanner');
            if (banner) {
                banner.style.display = 'none';
            }
        };

    function selectPackage(credits, total) {
        const button = event.target;
        const originalText = button.innerHTML;

        // Show loading
        button.classList.add('btn-loading');
        button.innerHTML = '<span class="loading-text">Processing...</span>';

        setTimeout(() => {
            button.classList.remove('btn-loading');
            button.innerHTML = originalText;
            showPaymentModal(credits, total);
        }, 500);
    }

        // Payment Modal Functions
        /*const showPaymentModal = (credits, total, isSubscription = false) => {
            // Reset coupon
            setAppliedCoupon(null);
            setOriginalTotal(0);
            setCouponCode('');
            setCouponMessage('');
            setIsCouponOpen(false);

            setCurrentPackage({ credits, total, isSubscription });
            setIsPaymentModalOpen(true);
            document.body.style.overflow = 'hidden';
        };*/

    function showPaymentModal(credits, total, isSubscription = false) {
        const modal = document.getElementById('paymentModal');

        // Reset coupon
        appliedCoupon = null;
        originalTotal = 0;
        document.getElementById('activeCoupon').style.display = 'none';
        document.querySelector('.toggle-coupon-btn').style.display = 'flex';
        document.getElementById('couponCode').value = '';
        document.getElementById('couponMessage').textContent = '';
        document.getElementById('couponInputWrapper').classList.remove('active');
        document.querySelector('.toggle-coupon-btn').classList.remove('active');
        document.getElementById('couponToggleText').textContent = 'Add code';

        // Calculate price per credit
        let pricePerCredit = total / credits;
        let originalTotalPrice = credits * 250;
        let discount = originalTotalPrice - total;
        let discountPercent = Math.round((discount / originalTotalPrice) * 100);

        // Update modal summary
        document.getElementById('modalCredits').textContent = credits;
        document.getElementById('modalPricePerCredit').textContent = '$' + pricePerCredit.toFixed(2);

        if (discount > 0) {
            document.getElementById('modalDiscountRow').style.display = 'flex';
            document.getElementById('modalDiscount').textContent = '-$' + discount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' (' + discountPercent + '% OFF)';
        } else {
            document.getElementById('modalDiscountRow').style.display = 'none';
        }

        document.getElementById('modalTotal').textContent = '$' + total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('submitAmount').textContent = '$' + total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        // Update BNPL amounts
        const quarterAmount = (total / 4).toFixed(2);
        document.getElementById('klarnaAmount').textContent = '$' + quarterAmount + ' x 4';
        document.getElementById('afterpayAmount').textContent = '$' + quarterAmount + ' x 4';
        const monthlyAmount = (total / 12).toFixed(2);
        document.getElementById('affirmAmount').textContent = '$' + monthlyAmount + '/mo for 12 months';

        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closePaymentModal() {
        const modal = document.getElementById('paymentModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

        // Express Payment Methods
        const processApplePay = () => {
            const total = document.getElementById('submitAmount')?.textContent || '$0.00';
            alert(`Redirecting to Apple Pay...\nTotal: ${total}\n\nIn production, this would use the Apple Pay JS API`);
        };

        const processGooglePay = () => {
            const total = document.getElementById('submitAmount')?.textContent || '$0.00';
            alert(`Redirecting to Google Pay...\nTotal: ${total}\n\nIn production, this would use the Google Pay API`);
        };

        // Buy Now Pay Later Methods
        const processKlarna = () => {
            const total = document.getElementById('submitAmount')?.textContent || '$0.00';
            const quarterAmount = document.getElementById('klarnaAmount')?.textContent || '$0.00 x 4';
            alert(`Redirecting to Klarna checkout...\nTotal: ${total}\n${quarterAmount}\n\nYou can pay in 4 interest-free installments`);
        };

        const processAfterpay = () => {
            const total = document.getElementById('submitAmount')?.textContent || '$0.00';
            const quarterAmount = document.getElementById('afterpayAmount')?.textContent || '$0.00 x 4';
            alert(`Redirecting to Afterpay...\nTotal: ${total}\n${quarterAmount}\n\nPay in 4 interest-free installments`);
        };

        const processAffirm = () => {
            const total = document.getElementById('submitAmount')?.textContent || '$0.00';
            const monthlyAmount = document.getElementById('affirmAmount')?.textContent || '$0.00/mo for 12 months';
            alert(`Redirecting to Affirm...\nTotal: ${total}\n${monthlyAmount}\n\nChoose your payment plan`);
        };

        // Card Payment Form
        const setupPaymentForm = () => {
            // Format card number
            const cardInput = document.getElementById('cardNumber');
            if (cardInput) {
                cardInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                    e.target.value = formattedValue;
                });
            }

            // Format expiry
            const expiryInput = document.getElementById('expiry');
            if (expiryInput) {
                expiryInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                    if (value.length >= 2) {
                        value = value.substring(0, 2) + '/' + value.substring(2, 4);
                    }
                    e.target.value = value;
                });
            }
        };

        const processCardPayment = (e) => {
            if (e) e.preventDefault();

            const email = document.getElementById('email')?.value;
            const cardNumber = document.getElementById('cardNumber')?.value;
            const total = document.getElementById('submitAmount')?.textContent || '$0.00';
            const button = document.querySelector('.submit-payment-btn');

            if (button) {
                const originalHTML = button.innerHTML;
                button.classList.add('btn-loading');
                button.innerHTML = '<span class="loading-text">Processing Payment...</span>';
                button.disabled = true;

                // Simulate payment processing
                setTimeout(() => {
                    let message = `✅ Payment successful!\n\nEmail: ${email}\nCard: **** **** **** ${cardNumber?.slice(-4) || '****'}\nAmount: ${total}`;

                    if (appliedCoupon) {
                        message += `\nPromo Code: ${appliedCoupon.code} applied`;
                    }

                    message += '\n\nCredits have been added to your account!';

                    alert(message);

                    // Reset button
                    button.classList.remove('btn-loading');
                    button.innerHTML = originalHTML;
                    button.disabled = false;

                    // Close modal
                    closePaymentModal();

                    // Update balance
                    setCreditBalance(prev => prev + currentPackage.credits);
                }, 2000);
            }
        };

        // Update existing functions to use modal
       /* const selectPackage = (credits, total) => {
            showPaymentModal(credits, total);
        };*/

        const purchaseCustom = () => {
            debugger
            const amount = parseInt(customAmount);
            if (amount && calculationResult) {
                showPaymentModal(amount, calculationResult.total);
            }
        };

    function saveMonthlySubscription() {
        const selected = document.querySelector('input[name="monthly"]:checked').value;
        const status = document.getElementById('monthlyStatus');
        const statusIndicator = status.querySelector('.status-indicator');
        const statusText = status.querySelector('.status-text');
        const button = event.target;

        if (selected === '0') {
            // Show loading state
            button.classList.add('loading');
            button.innerHTML = 'Cancelling...';

            // Simulate API call
            setTimeout(() => {
                statusIndicator.classList.remove('active');
                statusIndicator.classList.add('inactive');
                statusText.textContent = 'No monthly subscription active';
                status.style.background = '';
                status.style.borderColor = '';

                // Remove loading state
                button.classList.remove('loading');
                button.innerHTML = 'Save Monthly Subscription';

                alert('Monthly subscription cancelled successfully');
            }, 1500);
        } else {
            let price;
            switch(selected) {
                case '5': price = 1000; break;
                case '10': price = 1800; break;
                case '25': price = 4000; break;
                case '50': price = 7000; break;
            }

            // Show loading state
            button.classList.add('loading');
            button.innerHTML = 'Saving...';

            // Simulate payment processing
            setTimeout(() => {
                // Show payment modal for subscription
                button.classList.remove('loading');
                button.innerHTML = 'Save Monthly Subscription';
                showPaymentModal(parseInt(selected), price, true);

                // Update status after payment (this would happen after successful payment)
                statusIndicator.classList.remove('inactive');
                statusIndicator.classList.add('active');
                statusText.textContent = `${selected} credits will be purchased monthly`;
                status.style.background = 'rgba(22, 163, 74, 0.05)';
                status.style.borderColor = 'rgba(22, 163, 74, 0.2)';
            }, 1000);
        }
    }

        const saveAutoRecharge = () => {
            const button = document.querySelector('.auto-recharge');

            // Show loading state
            if (button) {
                button.classList.add('loading');
                button.innerHTML = 'Saving...';
            }

            // Simulate API call
            setTimeout(() => {
                if (!isAutoRechargeEnabled) {
                    if (button) {
                        button.classList.remove('loading');
                        button.innerHTML = 'Save Auto-Recharge Settings';
                    }
                    alert('Auto-recharge has been disabled');
                    return;
                }

                let price;
                switch(rechargeAmount) {
                    case '5': price = 1000; break;
                    case '10': price = 1800; break;
                    case '25': price = 4000; break;
                    case '50': price = 7000; break;
                    case '100': price = 12500; break;
                    default: price = 0;
                }

                if (button) {
                    button.classList.remove('loading');
                    button.innerHTML = 'Save Auto-Recharge Settings';
                }

                alert(`✅ Auto-recharge settings saved!\n\nWhen your balance drops below ${rechargeThreshold} credits, we'll automatically purchase ${rechargeAmount} credits for $${price.toLocaleString('en-US', {minimumFractionDigits: 2})}.\n\nPayment method on file will be charged automatically.`);
            }, 1500);
        };

        // Payment Method Functions
        function showAddPaymentModal() {
            const modal = document.getElementById('addPaymentModal');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

    function closeAddPaymentModal() {
        const modal = document.getElementById('addPaymentModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';

        // Reset forms
        document.querySelectorAll('.add-payment-form input').forEach(input => {
            if (input.type !== 'checkbox') {
                input.value = '';
            }
        });
    }

        const switchPaymentTab = (tab) => {
            // Update tabs
            document.querySelectorAll('.payment-tab').forEach(t => {
                t.classList.remove('active');
            });
            event.target.classList.add('active');

            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tab + 'Tab').classList.add('active');
        };

    function selectCrypto(crypto) {
        // Hide options, show form
        document.querySelector('.crypto-options').style.display = 'none';
        document.getElementById('cryptoForm').style.display = 'block';

        // Update selected crypto
        const cryptoNames = {
            'bitcoin': 'Bitcoin (BTC)',
            'ethereum': 'Ethereum (ETH)',
            'usdt': 'USDT (Tether)',
            'usdc': 'USD Coin (USDC)'
        };

        document.getElementById('selectedCryptoName').textContent = cryptoNames[crypto];

        // Update rate based on crypto
        const rates = {
            'bitcoin': '1 Credit = 0.0042 BTC (~$250)',
            'ethereum': '1 Credit = 0.063 ETH (~$250)',
            'usdt': '1 Credit = 250 USDT',
            'usdc': '1 Credit = 250 USDC'
        };

        document.querySelector('.crypto-rate').textContent = 'Current rate: ' + rates[crypto];
    }

    function changeCrypto() {
        document.querySelector('.crypto-options').style.display = 'grid';
        document.getElementById('cryptoForm').style.display = 'none';
    }

    function addCardPayment() {
        const button = event.target;
        const originalText = button.textContent;

        button.classList.add('btn-loading');
        button.textContent = 'Adding Card...';

        setTimeout(() => {
            button.classList.remove('btn-loading');
            button.textContent = originalText;

            alert('✅ Card added successfully!\n\nVisa •••• 1234 has been added to your payment methods.');
            closeAddPaymentModal();

            // In production, refresh payment methods list
        }, 1500);
    }

        const addBankAccount = () => {
            const button = document.querySelector('.add-payment-submit');
            if (button) {
                const originalText = button.textContent;
                button.classList.add('btn-loading');
                button.textContent = 'Verifying Account...';

                setTimeout(() => {
                    button.classList.remove('btn-loading');
                    button.textContent = originalText;
                    alert('✅ Bank account added!\n\nWe\'ve sent two small deposits to verify your account.\nPlease check your bank statement in 2-3 business days and verify the amounts.');
                    closeAddPaymentModal();
                }, 2000);
            }
        };

        function addCryptoWallet() {
        const button = event.target;
        const originalText = button.textContent;
        const walletAddress = document.getElementById('walletAddress').value;
        const cryptoName = document.getElementById('selectedCryptoName').textContent;

        if (!walletAddress) {
            alert('Please enter your wallet address');
            return;
        }

        button.classList.add('btn-loading');
        button.textContent = 'Adding Wallet...';

        setTimeout(() => {
            button.classList.remove('btn-loading');
            button.textContent = originalText;

            const shortAddress = walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 4);
            alert(`✅ ${cryptoName} wallet added!\n\nWallet address: ${shortAddress}\n\nYou can now pay with cryptocurrency for instant processing and lower fees.`);
            closeAddPaymentModal();
        }, 1500);
    }

        const editPaymentMethod = (id) => {
            alert(`Editing payment method ${id}...\n\nThis would allow updating:\n• Card number\n• Expiry date\n• Billing address`);
        };

        const removePaymentMethod = (id) => {
            if (confirm('Are you sure you want to remove this payment method?')) {
                const button = document.querySelector(`[onclick="removePaymentMethod(${id})"]`);
                const item = button?.closest('.payment-method-item');

                if (item) {
                    // Add fade out animation
                    item.style.opacity = '0.5';
                    item.style.pointerEvents = 'none';

                    setTimeout(() => {
                        item.style.display = 'none';
                        alert('Payment method removed successfully');
                    }, 500);
                }
            }
        };

    function setDefaultPayment(id) {
        const button = event.target;
        button.textContent = 'Setting...';

        setTimeout(() => {
            // Remove default from all items
            document.querySelectorAll('.payment-method-item').forEach(item => {
                item.classList.remove('default');
                const badge = item.querySelector('.default-badge');
                if (badge) badge.remove();
            });

            // Add default to selected item
            const item = button.closest('.payment-method-item');
            item.classList.add('default');

            const typeDiv = item.querySelector('.payment-method-type');
            const defaultBadge = document.createElement('span');
            defaultBadge.className = 'default-badge';
            defaultBadge.textContent = 'Default';
            typeDiv.appendChild(defaultBadge);

            // Update button
            button.style.display = 'none';

            alert('Default payment method updated');
        }, 1000);
    }

        const toggleAutoRecharge = () => {
            setIsAutoRechargeEnabled(!isAutoRechargeEnabled);

            const settings = document.getElementById('rechargeSettings');
            const status = document.getElementById('rechargeStatus');
            const statusIndicator = status?.querySelector('.status-indicator');
            const statusText = status?.querySelector('.status-text');

            if (settings && statusIndicator && statusText) {
                if (!isAutoRechargeEnabled) {
                    settings.classList.add('active');
                    statusIndicator.classList.remove('inactive');
                    statusIndicator.classList.add('active');
                    statusText.textContent = 'Auto-recharge is enabled';
                    status.style.background = 'rgba(22, 163, 74, 0.05)';
                    status.style.borderColor = 'rgba(22, 163, 74, 0.2)';
                } else {
                    settings.classList.remove('active');
                    statusIndicator.classList.remove('active');
                    statusIndicator.classList.add('inactive');
                    statusText.textContent = 'Auto-recharge is disabled';
                    status.style.background = '';
                    status.style.borderColor = '';
                }
            }
        };

        const updateRechargeExample = () => {
            let price;
            switch(rechargeAmount) {
                case '5': price = '$1,000'; break;
                case '10': price = '$1,800'; break;
                case '25': price = '$4,000'; break;
                case '50': price = '$7,000'; break;
                case '100': price = '$12,500'; break;
                default: price = '$0';
            }

            // Update example display
            const exampleThreshold = document.getElementById('exampleThreshold');
            const exampleAmount = document.getElementById('exampleAmount');
            const examplePrice = document.getElementById('examplePrice');

            if (exampleThreshold) exampleThreshold.textContent = rechargeThreshold;
            if (exampleAmount) exampleAmount.textContent = rechargeAmount;
            if (examplePrice) examplePrice.textContent = price;
        };

    function calculateCustom() {
        const amount = parseInt(customAmount);

        if (!amount || amount < 1) {
            alert('Please enter a valid amount');
            return;
        }

        let pricePerCredit, discountPercent;

        // Determine pricing tier
        if (amount >= 100) {
            pricePerCredit = 125;
            discountPercent = 50;
        } else if (amount >= 50) {
            pricePerCredit = 140;
            discountPercent = 44;
        } else if (amount >= 25) {
            pricePerCredit = 160;
            discountPercent = 36;
        } else if (amount >= 10) {
            pricePerCredit = 180;
            discountPercent = 28;
        } else if (amount >= 5) {
            pricePerCredit = 200;
            discountPercent = 20;
        } else {
            pricePerCredit = 250;
            discountPercent = 0;
        }

        const subtotal = amount * 250;
        const total = amount * pricePerCredit;
        const discount = subtotal - total;

        // Update display
        document.getElementById('resultCredits').textContent = amount;
        document.getElementById('resultPricePerCredit').textContent = '$' + pricePerCredit.toFixed(2);
        document.getElementById('resultSubtotal').textContent = '$' + subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('resultDiscount').textContent = '-$' + discount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' (' + discountPercent + '%)';
        document.getElementById('resultTotal').textContent = '$' + total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        // Show result
        document.getElementById('calculationResult').classList.add('active');

        setCalculationResult({subtotal, total, discount})
    }

        // Event handlers for key presses
        const handleCustomAmountKeyPress = (e) => {
            if (e.key === 'Enter') {
                calculateCustom();
            }
        };

        const handleCouponCodeKeyPress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyCoupon();
            }
        };

        // Update balance when creditBalance changes
        useEffect(() => {
            checkBalance();
        }, [creditBalance]);

    return (
        <>
            <div className="page-header">
                <div className="header-left">
                    <div className="crown-logo">
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                        </svg>
                    </div>
                    <h1 className="page-title">Buy Credits</h1>
                </div>
            </div>
            <div className="container">
                {/* Page Header */}


                {/* Current Balance */}
                <div className="balance-card">
                    <div className="balance-header">
                        <div className="balance-info">
                            <div className="balance-label">Current Balance</div>
                            <div className="balance-value">
                                <span id="creditBalance">23</span>
                                <span className="credit-label">Credits</span>
                            </div>
                        </div>
                        <div className="low-balance-warning" id="lowBalanceWarning">
                            <span className="warning-icon">⚠️</span>
                            <span
                                className="warning-text">Low balance - Purchase more credits to avoid service interruption</span>
                        </div>
                    </div>
                    <div className="balance-meter">
                        <div className="balance-fill" style={{width: '23%'}}></div>
                    </div>
                </div>

                {/* Promotional Banner */}
                <div className="promo-banner" id="promoBanner">
                    <div className="promo-content">
                        <div className="promo-icon">🎉</div>
                        <div className="promo-text">
                            <div className="promo-title">Limited Time Offer!</div>
                            <div className="promo-description">Use code <span className="promo-code">NEWCUSTOMER</span> for 20%
                                off your first purchase
                            </div>
                        </div>
                        <button className="promo-copy-btn" onClick={() => copyPromoCode('NEWCUSTOMER')}>Copy Code</button>
                    </div>
                    <button className="promo-close-btn" onClick={closePromoBanner}>×</button>
                </div>

                {/* Bulk Discount Info */}
                <div className="discount-info">
                    <div className="discount-title">
                        <span>💎</span>
                        <span>Automatic Bulk Discounts Applied</span>
                    </div>
                    <div className="discount-grid">
                        <div className="discount-tier">
                            <div className="tier-quantity">1-4 Credits</div>
                            <div className="tier-discount">0% OFF</div>
                        </div>
                        <div className="discount-tier">
                            <div className="tier-quantity">5-9 Credits</div>
                            <div className="tier-discount">20% OFF</div>
                        </div>
                        <div className="discount-tier">
                            <div className="tier-quantity">10-24 Credits</div>
                            <div className="tier-discount">28% OFF</div>
                        </div>
                        <div className="discount-tier">
                            <div className="tier-quantity">25-49 Credits</div>
                            <div className="tier-discount">36% OFF</div>
                        </div>
                        <div className="discount-tier">
                            <div className="tier-quantity">50-99 Credits</div>
                            <div className="tier-discount">44% OFF</div>
                        </div>
                        <div className="discount-tier">
                            <div className="tier-quantity">100+ Credits</div>
                            <div className="tier-discount">50% OFF</div>
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="pricing-grid">
                    {/* 1 Credit */}
                    <div className="pricing-card" onClick={() => selectPackage(1, 250)}>
                        <div className="credit-amount">1 Credit</div>
                        <div className="price-per-credit">$250.00</div>
                        <div className="price-label">per credit</div>
                        <div className="total-price">Total: $250.00</div>
                        <button className="purchase-btn">Purchase 1 Credit</button>
                    </div>

                    {/* 5 Credits */}
                    <div className="pricing-card" onClick={() => selectPackage(5, 1000)}>
                        <div className="credit-amount">5 Credits</div>
                        <div className="price-per-credit">$200.00</div>
                        <div className="price-label">per credit</div>
                        <div className="discount-badge">20% OFF</div>
                        <div className="total-price">Total: $1,000.00</div>
                        <div className="savings-text">Save $250!</div>
                        <button className="purchase-btn">Purchase 5 Credits</button>
                    </div>

                    {/* 10 Credits - Popular */}
                    <div className="pricing-card popular" onClick={() => selectPackage(10, 1800)}>
                        <span className="popular-badge">Most Popular</span>
                        <div className="credit-amount">10 Credits</div>
                        <div className="price-per-credit">$180.00</div>
                        <div className="price-label">per credit</div>
                        <div className="discount-badge">28% OFF</div>
                        <div className="total-price">Total: $1,800.00</div>
                        <div className="savings-text">Save $700!</div>
                        <button className="purchase-btn">Purchase 10 Credits</button>
                    </div>

                    {/* 25 Credits */}
                    <div className="pricing-card" onClick={() => selectPackage(25, 4000)}>
                        <div className="credit-amount">25 Credits</div>
                        <div className="price-per-credit">$160.00</div>
                        <div className="price-label">per credit</div>
                        <div className="discount-badge">36% OFF</div>
                        <div className="total-price">Total: $4,000.00</div>
                        <div className="savings-text">Save $2,250!</div>
                        <button className="purchase-btn">Purchase 25 Credits</button>
                    </div>

                    {/* 50 Credits */}
                    <div className="pricing-card" onClick={() => selectPackage(50, 7000)}>
                        <div className="credit-amount">50 Credits</div>
                        <div className="price-per-credit">$140.00</div>
                        <div className="price-label">per credit</div>
                        <div className="discount-badge">44% OFF</div>
                        <div className="total-price">Total: $7,000.00</div>
                        <div className="savings-text">Save $5,500!</div>
                        <button className="purchase-btn">Purchase 50 Credits</button>
                    </div>

                    {/* 100 Credits */}
                    <div className="pricing-card" onClick={() => selectPackage(100, 12500)}>
                        <div className="credit-amount">100 Credits</div>
                        <div className="price-per-credit">$125.00</div>
                        <div className="price-label">per credit</div>
                        <div className="discount-badge">50% OFF</div>
                        <div className="total-price">Total: $12,500.00</div>
                        <div className="savings-text">Save $12,500!</div>
                        <button className="purchase-btn">Purchase 100 Credits</button>
                    </div>
                </div>

                {/* Custom Amount */}
                <div className="custom-card">
                    <div className="custom-header">
                        <h2 className="custom-title">Custom Amount</h2>
                        <p className="custom-subtitle">Enter any quantity and automatic bulk discounts will be applied</p>
                    </div>
                    <div className="custom-input-group">
                        <div className="input-wrapper">
                            <label className="input-label" htmlFor="customAmount">Number of Credits</label>
                            <input
                                onChange={(e) => setCustomAmount(e.target.value)}
                                type="number"
                                id="customAmount"
                                className="custom-input"
                                placeholder="Enter amount"
                                min="1"
                                value={customAmount}
                            />                        </div>
                        <button className="calculate-btn" onClick={calculateCustom}>Calculate Price</button>
                    </div>
                    <div className="calculation-result" id="calculationResult">
                        <div className="result-row">
                            <span className="result-label">Credits:</span>
                            <span className="result-value" id="resultCredits">0</span>
                        </div>
                        <div className="result-row">
                            <span className="result-label">Price per Credit:</span>
                            <span className="result-value" id="resultPricePerCredit">$0</span>
                        </div>
                        <div className="result-row">
                            <span className="result-label">Subtotal:</span>
                            <span className="result-value" id="resultSubtotal">$0</span>
                        </div>
                        <div className="result-row">
                            <span className="result-label">Discount Applied:</span>
                            <span className="result-discount" id="resultDiscount">$0 (0%)</span>
                        </div>
                        <div className="result-row">
                            <span className="result-label">Total Price:</span>
                            <span className="result-value" id="resultTotal">$0</span>
                        </div>
                        <button className="purchase-btn" style={{marginTop: '1rem', width: '100%'}} onClick={purchaseCustom}>
                            Purchase Credits
                        </button>
                    </div>
                </div>

                {/* Automatic Purchase Settings */}
                <div className="auto-purchase-grid">
                    {/* Monthly Subscription */}
                    <div className="custom-card">
                        <div className="custom-header">
                            <h2 className="custom-title">
                                <span style={{marginRight: '0.5rem'}}>🔄</span>
                                Monthly Auto-Purchase
                            </h2>
                            <p className="custom-subtitle">Set up automatic monthly credit purchases at discounted rates</p>
                        </div>

                        <div className="auto-status-banner" id="monthlyStatus">
                            <div className="status-indicator inactive"></div>
                            <span className="status-text">No monthly subscription active</span>
                        </div>

                        <div className="subscription-options">
                            <label className="subscription-option">
                                <input type="radio" name="monthly" value="0" defaultChecked/>
                                <div className="option-content">
                                    <div className="option-title">No Subscription</div>
                                    <div className="option-price">Manual purchases only</div>
                                </div>
                            </label>

                            <label className="subscription-option">
                                <input type="radio" name="monthly" value="5"/>
                                <div className="option-content">
                                    <div className="option-title">5 Credits Monthly</div>
                                    <div className="option-price">$1,000/month</div>
                                    <div className="option-savings">Save $250 monthly</div>
                                </div>
                            </label>

                            <label className="subscription-option">
                                <input type="radio" name="monthly" value="10"/>
                                <div className="option-content">
                                    <span className="recommended-badge">Recommended</span>
                                    <div className="option-title">10 Credits Monthly</div>
                                    <div className="option-price">$1,800/month</div>
                                    <div className="option-savings">Save $700 monthly</div>
                                </div>
                            </label>

                            <label className="subscription-option">
                                <input type="radio" name="monthly" value="25" />
                                <div className="option-content">
                                    <div className="option-title">25 Credits Monthly</div>
                                    <div className="option-price">$4,000/month</div>
                                    <div className="option-savings">Save $2,250 monthly</div>
                                </div>
                            </label>

                            <label className="subscription-option">
                                <input type="radio" name="monthly" value="50" />
                                <div className="option-content">
                                    <div className="option-title">50 Credits Monthly</div>
                                    <div className="option-price">$7,000/month</div>
                                    <div className="option-savings">Save $5,500 monthly</div>
                                </div>
                            </label>
                        </div>

                        <div className="subscription-details">
                            <div className="detail-item">
                                <span>✓</span> Charges on the same day each month
                            </div>
                            <div className="detail-item">
                                <span>✓</span> Cancel or modify anytime
                            </div>
                            <div className="detail-item">
                                <span>✓</span> 5% extra discount on monthly plans
                            </div>
                        </div>

                        <button className="save-settings-btn" onClick={saveMonthlySubscription}>
                            Save Monthly Subscription
                        </button>
                    </div>

                    {/* Auto-Recharge */}
                    <div className="custom-card">
                        <div className="custom-header">
                            <h2 className="custom-title">
                                <span style={{marginRight: '0.5rem'}}>⚡</span>
                                Auto-Recharge
                            </h2>
                            <p className="custom-subtitle">Automatically purchase credits when balance is low</p>
                        </div>

                        <div className="auto-status-banner" id="rechargeStatus">
                            <div className="status-indicator inactive"></div>
                            <span className="status-text">Auto-recharge is disabled</span>
                        </div>

                        <div className="recharge-toggle">
                            <label className="toggle-switch">
                                <input type="checkbox" id="enableAutoRecharge" onChange={toggleAutoRecharge} />
                                <span className="toggle-slider"></span>
                            </label>
                            <span className="toggle-label">Enable Auto-Recharge</span>
                        </div>

                        <div className="recharge-settings" id="rechargeSettings">
                            <div className="setting-group">
                                <label className="input-label">When balance drops below:</label>
                                <select className="custom-select" id="rechargeThreshold">
                                    <option value="5">5 Credits</option>
                                    <option value="10">10 Credits</option>
                                    <option value="20">20 Credits</option>
                                    <option value="30">30 Credits</option>
                                    <option value="50">50 Credits</option>
                                </select>
                            </div>

                            <div className="setting-group">
                                <label className="input-label">Automatically purchase:</label>
                                <select className="custom-select" id="rechargeAmount">
                                    <option value="5">5 Credits ($1,000)</option>
                                    <option value="10">10 Credits ($1,800)</option>
                                    <option value="25">25 Credits ($4,000)</option>
                                    <option value="50">50 Credits ($7,000)</option>
                                    <option value="100">100 Credits ($12,500)</option>
                                </select>
                            </div>

                            <div className="recharge-example">
                                <div className="example-icon">💡</div>
                                <div className="example-text">
                                    <strong>Example:</strong> When your balance drops below <span id="exampleThreshold">10</span> credits, we'll automatically purchase <span id="exampleAmount">10</span> credits for <span id="examplePrice">$1,800</span>
                                </div>
                            </div>

                            <div className="payment-method">
                                <label className="input-label">Payment Method:</label>
                                <div className="payment-card">
                                    <div className="card-icon">💳</div>
                                    <div className="card-details">
                                        <div className="card-type">Visa ****4242</div>
                                        <div className="card-expiry">Expires 12/2025</div>
                                    </div>
                                    <button className="change-card-btn">Change</button>
                                </div>
                            </div>

                            <div className="subscription-details">
                                <div className="detail-item">
                                    <span>✓</span> Never run out of credits
                                </div>
                                <div className="detail-item">
                                    <span>✓</span> Email notification before charging
                                </div>
                                <div className="detail-item">
                                    <span>✓</span> Same bulk discounts apply
                                </div>
                            </div>
                        </div>

                        <button className="save-settings-btn auto-recharge" onClick={saveAutoRecharge}>
                            Save Auto-Recharge Settings
                        </button>
                    </div>
                </div>

                {/* Payment Methods Section */}
                <div className="payment-methods-card p-4">
                    <div className="card-header">
                        <h2 className="card-title">Payment Methods</h2>
                        <button className="add-payment-btn" onClick={showAddPaymentModal}>
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                            Add Payment Method
                        </button>
                    </div>
                    <div className="payment-methods-list">
                        {/* Default Payment Method */}
                        <div className="payment-method-item default">
                            <div className="payment-method-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24">
                                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                </svg>
                            </div>
                            <div className="payment-method-details">
                                <div className="payment-method-type">
                                    <span className="card-brand">Visa</span>
                                    <span className="card-last4">•••• 4242</span>
                                    <span className="default-badge">Default</span>
                                </div>
                                <div className="payment-method-expiry">Expires 12/2025</div>
                            </div>
                            <div className="payment-method-actions">
                                <button className="payment-action-btn" onClick={() => editPaymentMethod(1)}>Edit</button>
                                <button className="payment-action-btn remove" onClick={() => removePaymentMethod(1)}>Remove</button>
                            </div>
                        </div>

                        {/* Secondary Payment Method */}
                        <div className="payment-method-item">
                            <div className="payment-method-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24">
                                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                </svg>
                            </div>
                            <div className="payment-method-details">
                                <div className="payment-method-type">
                                    <span className="card-brand">Mastercard</span>
                                    <span className="card-last4">•••• 5555</span>
                                </div>
                                <div className="payment-method-expiry">Expires 08/2024</div>
                            </div>
                            <div className="payment-method-actions">
                                <button className="payment-action-btn" onClick={() => setDefaultPayment(2)}>Set Default</button>
                                <button className="payment-action-btn" onClick={() => editPaymentMethod(2)}>Edit</button>
                                <button className="payment-action-btn remove" onClick={() => removePaymentMethod(2)}>Remove</button>
                            </div>
                        </div>

                        {/* Bank Account */}
                        <div className="payment-method-item">
                            <div className="payment-method-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24">
                                    <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/>
                                </svg>
                            </div>
                            <div className="payment-method-details">
                                <div className="payment-method-type">
                                    <span className="card-brand">Bank Account</span>
                                    <span className="card-last4">•••• 6789</span>
                                </div>
                                <div className="payment-method-expiry">Chase Checking</div>
                            </div>
                            <div className="payment-method-actions">
                                <button className="payment-action-btn" onClick={() => setDefaultPayment(3)}>Set Default</button>
                                <button className="payment-action-btn" onClick={() => editPaymentMethod(3)}>Edit</button>
                                <button className="payment-action-btn remove" onClick={() => removePaymentMethod(3)}>Remove</button>
                            </div>
                        </div>

                        {/* Crypto Wallet */}
                        <div className="payment-method-item">
                            <div className="payment-method-icon crypto">
                                <svg viewBox="0 0 24 24" width="24" height="24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h3.5c.55 0 1 .45 1 1s-.45 1-1 1H13v1.25h1.5c.55 0 1 .45 1 1s-.45 1-1 1H13V14h2c.55 0 1 .45 1 1s-.45 1-1 1h-3c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1z"/>
                                </svg>
                            </div>
                            <div className="payment-method-details">
                                <div className="payment-method-type">
                                    <span className="card-brand">Bitcoin</span>
                                    <span className="card-last4">bc1q...8k9f</span>
                                </div>
                                <div className="payment-method-expiry">Primary Wallet</div>
                            </div>
                            <div className="payment-method-actions">
                                <button className="payment-action-btn" onClick={() => setDefaultPayment(4)}>Set Default</button>
                                <button className="payment-action-btn" onClick={() => editPaymentMethod(4)}>Edit</button>
                                <button className="payment-action-btn remove" onClick={() => removePaymentMethod(4)}>Remove</button>
                            </div>
                        </div>

                        {/* Ethereum Wallet */}
                        <div className="payment-method-item">
                            <div className="payment-method-icon crypto">
                                <svg viewBox="0 0 24 24" width="24" height="24">
                                    <path d="M12 2L4 9l8 4.5L20 9l-8-7zm0 16.5L4 14l8 6 8-6-8 4.5z"/>
                                </svg>
                            </div>
                            <div className="payment-method-details">
                                <div className="payment-method-type">
                                    <span className="card-brand">Ethereum</span>
                                    <span className="card-last4">0x7f...3d2a</span>
                                </div>
                                <div className="payment-method-expiry">MetaMask Wallet</div>
                            </div>
                            <div className="payment-method-actions">
                                <button className="payment-action-btn" onClick={() => setDefaultPayment(5)}>Set Default</button>
                                <button className="payment-action-btn" onClick={() => editPaymentMethod(5)}>Edit</button>
                                <button className="payment-action-btn remove" onClick={() => removePaymentMethod(5)}>Remove</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Payment Method Modal */}
                <div className="add-payment-modal" id="addPaymentModal">
                    <div className="add-payment-content">
                        <div className="modal-header">
                            <h2 className="modal-title">Add Payment Method</h2>
                            <button className="modal-close-btn" onClick={closeAddPaymentModal}>×</button>
                        </div>

                        <div className="modal-body">
                            {/* Payment Method Tabs */}
                            <div className="payment-tabs">
                                <button className="payment-tab active" onClick={() => switchPaymentTab('card')}>
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                    </svg>
                                    Credit/Debit Card
                                </button>
                                <button className="payment-tab" onClick={() => switchPaymentTab('bank')}>
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/>
                                    </svg>
                                    Bank Account
                                </button>
                                <button className="payment-tab" onClick={() => switchPaymentTab('crypto')}>
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                    </svg>
                                    Cryptocurrency
                                </button>
                            </div>

                            {/* Card Form */}
                            <div className="tab-content active" id="cardTab">
                                <form className="add-payment-form">
                                    <div className="form-field">
                                        <label>Card Number</label>
                                        <input type="text" placeholder="1234 5678 9012 3456" maxLength="19" />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label>Expiry Date</label>
                                            <input type="text" placeholder="MM/YY" maxLength="5" />
                                        </div>
                                        <div className="form-field">
                                            <label>CVV</label>
                                            <input type="text" placeholder="123" maxLength="3" />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label>Cardholder Name</label>
                                        <input type="text" placeholder="John Doe" />
                                    </div>
                                    <div className="form-field">
                                        <label>Billing ZIP Code</label>
                                        <input type="text" placeholder="12345" />
                                    </div>
                                    <div className="form-checkbox">
                                        <input type="checkbox" id="setDefaultCard" />
                                        <label htmlFor="setDefaultCard">Set as default payment method</label>
                                    </div>
                                    <button type="button" className="add-payment-submit" onClick={addCardPayment}>Add Card</button>
                                </form>
                            </div>

                            {/* Bank Account Form */}
                            <div className="tab-content" id="bankTab">
                                <form className="add-payment-form">
                                    <div className="form-field">
                                        <label>Account Holder Name</label>
                                        <input type="text" placeholder="John Doe" />
                                    </div>
                                    <div className="form-field">
                                        <label>Routing Number</label>
                                        <input type="text" placeholder="123456789" maxLength="9" />
                                    </div>
                                    <div className="form-field">
                                        <label>Account Number</label>
                                        <input type="text" placeholder="000123456789" />
                                    </div>
                                    <div className="form-field">
                                        <label>Account Type</label>
                                        <select>
                                            <option>Checking</option>
                                            <option>Savings</option>
                                        </select>
                                    </div>
                                    <div className="bank-verify-note">
                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                        </svg>
                                        We'll make two small deposits to verify your account (2-3 business days)
                                    </div>
                                    <div className="form-checkbox">
                                        <input type="checkbox" id="setDefaultBank" />
                                        <label htmlFor="setDefaultBank">Set as default payment method</label>
                                    </div>
                                    <button type="button" className="add-payment-submit" onClick={addBankAccount}>Add Bank Account</button>
                                </form>
                            </div>

                            {/* Crypto Form */}
                            <div className="tab-content" id="cryptoTab">
                                <div className="crypto-options">
                                    <div className="crypto-option" onClick={() => selectCrypto('bitcoin')}>
                                        <div className="crypto-icon">
                                            <svg viewBox="0 0 24 24" width="32" height="32" fill="#f7931a">
                                                <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z"/>
                                            </svg>
                                        </div>
                                        <div className="crypto-name">Bitcoin</div>
                                        <div className="crypto-ticker">BTC</div>
                                    </div>
                                    <div className="crypto-option" onClick={() => selectCrypto('ethereum')}>
                                        <div className="crypto-icon">
                                            <svg viewBox="0 0 24 24" width="32" height="32" fill="#627eea">
                                                <path d="M12 2L4 9l8 4.5L20 9l-8-7zm0 16.5L4 14l8 6 8-6-8 4.5z"/>
                                            </svg>
                                        </div>
                                        <div className="crypto-name">Ethereum</div>
                                        <div className="crypto-ticker">ETH</div>
                                    </div>
                                    <div className="crypto-option" onClick={() => selectCrypto('usdt')}>
                                        <div className="crypto-icon">
                                            <svg viewBox="0 0 24 24" width="32" height="32" fill="#26a17b">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1.31-8.11V9.5h2.94V8.06h-8.5V9.5h2.94v2.39c-2.69.16-4.69.71-4.69 1.36 0 .65 2 1.2 4.69 1.36v4.33h2.62v-4.33c2.69-.16 4.69-.71 4.69-1.36 0-.65-2-1.2-4.69-1.36z"/>
                                            </svg>
                                        </div>
                                        <div className="crypto-name">USDT</div>
                                        <div className="crypto-ticker">Tether</div>
                                    </div>
                                    <div className="crypto-option" onClick={() => selectCrypto('usdc')}>
                                        <div className="crypto-icon">
                                            <svg viewBox="0 0 24 24" width="32" height="32" fill="#2775ca">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13c0-.55.45-1 1-1s1 .45 1 1v1c1.66 0 3 1.34 3 3s-1.34 3-3 3h-2c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1-.45 1-1s-.45-1-1-1h-1c-.55 0-1-.45-1-1V7z"/>
                                            </svg>
                                        </div>
                                        <div className="crypto-name">USD Coin</div>
                                        <div className="crypto-ticker">USDC</div>
                                    </div>
                                </div>

                                <div className="crypto-form" id="cryptoForm" style={{display: 'none'}}>
                                    <div className="selected-crypto" id="selectedCrypto">
                                        <span id="selectedCryptoName">Bitcoin</span>
                                        <button className="change-crypto-btn" onClick={changeCrypto}>Change</button>
                                    </div>
                                    <div className="form-field">
                                        <label>Wallet Address</label>
                                        <input type="text" id="walletAddress" placeholder="Enter your wallet address" />
                                    </div>
                                    <div className="form-field">
                                        <label>Wallet Name (Optional)</label>
                                        <input type="text" id="walletName" placeholder="e.g., My Hardware Wallet" />
                                    </div>
                                    <div className="crypto-info">
                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                            <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                        </svg>
                                        <div>
                                            <p>Crypto payments are processed instantly with lower fees</p>
                                            <p className="crypto-rate">Current rate: 1 Credit = 0.0042 BTC</p>
                                        </div>
                                    </div>
                                    <div className="form-checkbox">
                                        <input type="checkbox" id="setDefaultCrypto" />
                                        <label htmlFor="setDefaultCrypto">Set as default payment method</label>
                                    </div>
                                    <button type="button" className="add-payment-submit" onClick={addCryptoWallet}>Add Wallet</button>
                                </div>
                            </div>

                            {/* Supported Cards/Banks */}
                            <div className="supported-methods">
                                <div className="supported-title">Accepted Payment Methods</div>
                                <div className="supported-icons">
                                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 32'%3E%3Crect width='48' height='32' rx='4' fill='%23005DAA'/%3E%3Ctext x='24' y='20' text-anchor='middle' fill='white' font-family='Arial' font-size='10' font-weight='bold'%3EVISA%3C/text%3E%3C/svg%3E" alt="Visa" />
                                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 32'%3E%3Crect width='48' height='32' rx='4' fill='%23EB001B'/%3E%3Ctext x='24' y='20' text-anchor='middle' fill='white' font-family='Arial' font-size='8' font-weight='bold'%3EMaster%3C/text%3E%3C/svg%3E" alt="Mastercard" />
                                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 32'%3E%3Crect width='48' height='32' rx='4' fill='%23006FCF'/%3E%3Ctext x='24' y='20' text-anchor='middle' fill='white' font-family='Arial' font-size='8' font-weight='bold'%3EAMEX%3C/text%3E%3C/svg%3E" alt="Amex" />
                                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 32'%3E%3Crect width='48' height='32' rx='4' fill='%23FF5F00'/%3E%3Ctext x='24' y='20' text-anchor='middle' fill='white' font-family='Arial' font-size='8' font-weight='bold'%3EDiscover%3C/text%3E%3C/svg%3E" alt="Discover" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order History */}
                <div className="history-card">
                    <div className="card-header">
                        <h2 className="card-title">Order History</h2>
                    </div>
                    <div className="history-table">
                        <div className="table-header">
                            <div>DATE</div>
                            <div>CREDITS</div>
                            <div>AMOUNT</div>
                            <div>PAYMENT METHOD</div>
                            <div>STATUS</div>
                            <div>INVOICE</div>
                        </div>

                        <div className="table-row">
                            <div data-label="Date:">Oct 15, 2024</div>
                            <div data-label="Credits:">10</div>
                            <div data-label="Amount:">$1,800.00</div>
                            <div data-label="Payment:">Visa ****4242</div>
                            <div data-label="Status:"><span className="status-badge status-completed">Completed</span></div>
                            <div data-label="Invoice:"><button className="invoice-btn">Download</button></div>
                        </div>

                        <div className="table-row">
                            <div data-label="Date:">Sep 28, 2024</div>
                            <div data-label="Credits:">25</div>
                            <div data-label="Amount:">$4,000.00</div>
                            <div data-label="Payment:">Mastercard ****5555</div>
                            <div data-label="Status:"><span className="status-badge status-completed">Completed</span></div>
                            <div data-label="Invoice:"><button className="invoice-btn">Download</button></div>
                        </div>

                        <div className="table-row">
                            <div data-label="Date:">Sep 10, 2024</div>
                            <div data-label="Credits:">5</div>
                            <div data-label="Amount:">$1,000.00</div>
                            <div data-label="Payment:">Visa ****4242</div>
                            <div data-label="Status:"><span className="status-badge status-completed">Completed</span></div>
                            <div data-label="Invoice:"><button className="invoice-btn">Download</button></div>
                        </div>

                        <div className="table-row">
                            <div data-label="Date:">Aug 15, 2024</div>
                            <div data-label="Credits:">50</div>
                            <div data-label="Amount:">$7,000.00</div>
                            <div data-label="Payment:">ACH Transfer</div>
                            <div data-label="Status:"><span className="status-badge status-completed">Completed</span></div>
                            <div data-label="Invoice:"><button className="invoice-btn">Download</button></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="payment-modal" id="paymentModal">
                <div className="payment-modal-content">
                    <div className="payment-modal-header">
                        <h2 className="payment-modal-title">Complete Your Purchase</h2>
                        <button className="modal-close-btn" onClick={closePaymentModal}>×</button>
                    </div>

                    <div className="payment-modal-body">
                        <div className="order-summary">
                            <h3 className="summary-title">Order Summary</h3>
                            <div className="summary-details">
                                <div className="summary-row">
                                    <span className="summary-label">Credits:</span>
                                    <span className="summary-value" id="modalCredits">10</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Price per Credit:</span>
                                    <span className="summary-value" id="modalPricePerCredit">$180.00</span>
                                </div>
                                <div className="summary-row discount-row" id="modalDiscountRow">
                                    <span className="summary-label">Discount:</span>
                                    <span className="summary-discount" id="modalDiscount">-$700.00 (28% OFF)</span>
                                </div>
                                <div className="summary-row total-row">
                                    <span className="summary-label">Total:</span>
                                    <span className="summary-total" id="modalTotal">$1,800.00</span>
                                </div>
                            </div>
                        </div>

                        <div className="coupon-section">
                            <div className="coupon-header">
                                <h3 className="checkout-section-title">Have a Promo Code?</h3>
                                <button type="button" className="toggle-coupon-btn" onClick={toggleCoupon}>
                                    <span id="couponToggleText">Add code</span>
                                    <svg viewBox="0 0 24 24" width="16" height="16">
                                        <path d="M7 10l5 5 5-5z"/>
                                    </svg>
                                </button>
                            </div>
                            <div className="coupon-input-wrapper" id="couponInputWrapper">
                                <div className="coupon-field">
                                    <input type="text" id="couponCode" placeholder="Enter promo code"
                                           className="coupon-input"/>
                                    <button type="button" className="apply-coupon-btn" onClick={applyCoupon}>Apply
                                    </button>
                                </div>
                                <div className="coupon-message" id="couponMessage"></div>
                            </div>
                            <div className="active-coupon" id="activeCoupon" style={{display: 'none'}}>
                                <div className="coupon-badge">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#16a34a">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                    </svg>
                                    <span className="coupon-code-display" id="appliedCouponCode">SAVE20</span>
                                    <span className="coupon-discount-amount" id="couponDiscountAmount">-$360.00</span>
                                    <button type="button" className="remove-coupon-btn" onClick={removeCoupon}>×
                                    </button>
                                </div>
                            </div>
                        </div>


                        <div className="express-checkout">
                            <h3 className="checkout-section-title">Express Checkout</h3>
                            <div className="express-buttons">
                                <button className="express-btn apple-pay" onClick={processApplePay}>
                                    <svg className="pay-icon" viewBox="0 0 24 24">
                                        <path
                                            d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                                    </svg>
                                    <span>Apple Pay</span>
                                </button>
                                <button className="express-btn google-pay" onClick={processGooglePay}>
                                    <svg className="pay-icon" viewBox="0 0 24 24">
                                        <path
                                            d="M10.08 10.86c.05-.33.16-.62.3-.87s.34-.46.59-.62c.24-.15.54-.22.91-.23.19.01.38.04.54.11s.31.17.43.29.22.26.29.42.1.35.09.55l-1.56.13c-.02-.17-.1-.3-.24-.38s-.31-.12-.51-.12c-.22 0-.39.05-.51.15s-.18.22-.18.36c0 .12.04.21.12.28s.19.14.32.19.29.1.48.14.39.09.61.14c.2.05.39.12.58.19s.35.18.51.3.29.28.38.49.13.47.11.77c-.03.34-.16.64-.31.89s-.35.46-.61.61-.58.23-.95.23c-.44 0-.84-.11-1.18-.32s-.58-.52-.71-.92l1.63-.16c.03.22.13.39.29.49s.36.15.62.15c.24 0 .43-.05.56-.16s.2-.25.2-.43c0-.13-.05-.24-.14-.32s-.22-.16-.38-.21-.34-.1-.55-.15-.42-.09-.64-.14-.42-.13-.61-.21-.35-.2-.48-.34-.24-.32-.31-.53-.09-.48-.06-.83Z"/>
                                        <path
                                            d="M20.16 12.29l-.93-.26c-.14.52-.35.98-.63 1.38s-.62.73-1.01 1l.79.6c.48-.34.89-.77 1.22-1.29s.54-1.14.56-1.43Zm-2.84-.76c.03-.31-.02-.59-.16-.83s-.37-.36-.7-.36c-.15 0-.3.04-.43.11s-.24.18-.33.31-.15.29-.18.46-.01.36.07.56c.06.16.15.3.27.41s.26.2.42.25.33.05.5.01.32-.14.43-.27s.18-.3.21-.48l-.1-.17Zm-3.06 1.83c-.28-.28-.44-.62-.48-1.02s.04-.76.22-1.07.45-.52.81-.64.75-.12 1.17 0c.19.06.36.15.51.27s.28.26.38.43.17.36.21.57.03.43-.01.65c-.08.41-.28.73-.6.96s-.7.3-1.13.21c-.22-.04-.43-.14-.58-.28l-.49-.08Z"/>
                                        <path
                                            d="M3.93 11.3c0-.75.19-1.42.58-2.01s.92-1.04 1.6-1.36c.68-.31 1.44-.47 2.29-.47.71 0 1.36.11 1.95.34s1.08.54 1.48.95c.39.41.65.89.76 1.44l-2.19.27c-.09-.27-.28-.49-.57-.65s-.62-.24-1-.24c-.62 0-1.11.19-1.48.56s-.55.88-.55 1.53v.29c0 .64.18 1.15.54 1.52s.86.56 1.49.56c.39 0 .72-.08 1.01-.24s.48-.39.57-.67l2.19.27c-.11.55-.37 1.03-.76 1.44-.4.41-.9.72-1.49.95s-1.24.34-1.95.34c-.85 0-1.61-.16-2.29-.48s-1.21-.77-1.6-1.36-.58-1.27-.58-2.02v-.36Z"/>
                                    </svg>
                                    <span>Google Pay</span>
                                </button>
                            </div>
                        </div>

                        <div className="divider">
                            <span>or</span>
                        </div>


                        <div className="bnpl-section">
                            <h3 className="checkout-section-title">Buy Now, Pay Later</h3>
                            <div className="bnpl-options">
                                <button className="bnpl-btn" onClick={processKlarna}>
                                    <div className="bnpl-logo klarna">Klarna</div>
                                    <div className="bnpl-info">
                                        <div className="bnpl-title">4 interest-free payments</div>
                                        <div className="bnpl-amount" id="klarnaAmount">$450.00 x 4</div>
                                    </div>
                                </button>
                                <button className="bnpl-btn" onClick={processAfterpay}>
                                    <div className="bnpl-logo afterpay">afterpay</div>
                                    <div className="bnpl-info">
                                        <div className="bnpl-title">4 interest-free installments</div>
                                        <div className="bnpl-amount" id="afterpayAmount">$450.00 x 4</div>
                                    </div>
                                </button>
                                <button className="bnpl-btn" onClick={processAffirm}>
                                    <div className="bnpl-logo affirm">affirm</div>
                                    <div className="bnpl-info">
                                        <div className="bnpl-title">Monthly payments from</div>
                                        <div className="bnpl-amount" id="affirmAmount">$150/mo for 12 months</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="divider">
                            <span>or</span>
                        </div>


                        <div className="card-payment-section">
                            <h3 className="checkout-section-title">Pay with Card</h3>
                            <form className="payment-form" id="paymentForm">
                                <div className="form-field">
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id="email" placeholder="john@example.com" required/>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="cardNumber">Card Number</label>
                                    <div className="card-input-wrapper">
                                        <input type="text" id="cardNumber" placeholder="1234 5678 9012 3456"
                                               maxLength="19" required/>
                                        <div className="card-icons">
                                            <svg className="card-icon" viewBox="0 0 24 24">
                                                <path
                                                    d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-field">
                                        <label htmlFor="expiry">Expiry</label>
                                        <input type="text" id="expiry" placeholder="MM/YY" maxLength="5" required/>
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="cvc">CVC</label>
                                        <input type="text" id="cvc" placeholder="123" maxLength="3" required/>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="cardName">Name on Card</label>
                                    <input type="text" id="cardName" placeholder="John Doe" required/>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="country">Country</label>
                                    <select id="country" required>
                                        <option value="US">United States</option>
                                        <option value="CA">Canada</option>
                                        <option value="GB">United Kingdom</option>
                                        <option value="AU">Australia</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="save-card-option">
                                    <input type="checkbox" id="saveCard" defaultChecked />
                                    <label htmlFor="saveCard">Save card for future purchases</label>
                                </div>

                                <button type="submit" className="submit-payment-btn">
                                    <span className="btn-text">Complete Purchase</span>
                                    <span className="btn-amount" id="submitAmount">$1,800.00</span>
                                </button>
                            </form>
                        </div>


                        <div className="security-badge">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                            </svg>
                            <span>Secured by Stripe. Your payment information is encrypted and secure.</span>
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
};

export default BuyCreditsPage;