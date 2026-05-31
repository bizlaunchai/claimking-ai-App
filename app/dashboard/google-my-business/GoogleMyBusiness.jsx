"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosInstance";
import "./google-my-business.css";

// ── Authed S3 thumbnail ────────────────────────────────────────────────────
const AuthedImg = ({ s3Key, alt, className, style }) => {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        if (!s3Key) return;
        let active = true;
        let objectUrl;
        (async () => {
            try {
                const res = await axiosInstance.get("/s3/file", {
                    params: { key: s3Key },
                    responseType: "blob",
                    suppressErrorToast: true,
                });
                objectUrl = URL.createObjectURL(res.data);
                if (active) setUrl(objectUrl);
            } catch {}
        })();
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [s3Key]);
    if (!url) return <div className={className} style={style} />;
    return <img src={url} alt={alt ?? ""} className={className} style={style} />;
};

const fmtDate = (iso) => {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (days <= 0) return "today";
        if (days === 1) return "1 day ago";
        if (days < 14) return `${days} days ago`;
        return d.toLocaleDateString();
    } catch {
        return iso;
    }
};
const fmtFutureDate = (iso) => {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
};

const initials = (name) =>
    (name ?? "?")
        .split(/\s+/)
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

const DEFAULT_SETTINGS = {
    enabled: false,
    require_approval: true,
    schedule_days: ["mon", "wed", "fri"],
    post_time: "10:00:00",
    timezone: "America/New_York",
    caption_style: "professional",
    include_cta: true,
    cta_text: "Free inspection — call us today!",
    hashtags: "",
    auto_reply_5star: false,
    alert_low_star_sms: false,
    alert_low_star_number: "",
};

const TABS = [
    { id: "reviews", label: "Reviews" },
    { id: "posts", label: "Posts" },
    { id: "autopost", label: "AI Auto-Posting" },
    { id: "qa", label: "Q&A" },
    { id: "insights", label: "Insights" },
    { id: "settings", label: "Settings" },
];

// ────────────────────────────────────────────────────────────────────────────
const GoogleMyBusinessPage = () => {
    const [tab, setTab] = useState("reviews");
    const [connection, setConnection] = useState(null);
    const [oauthConfigured, setOauthConfigured] = useState(true);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [reviews, setReviews] = useState([]);
    const [reviewFilter, setReviewFilter] = useState({ rating: "", replied: "all" });

    const [posts, setPosts] = useState([]);
    const [postContent, setPostContent] = useState("");
    const [postType, setPostType] = useState("update");
    const [publishing, setPublishing] = useState(false);

    const [questions, setQuestions] = useState([]);
    const [gallery, setGallery] = useState([]);
    const [settings, setSettings] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [monthMetrics, setMonthMetrics] = useState(null);
    const [upcoming, setUpcoming] = useState([]);
    const [generatingNow, setGeneratingNow] = useState(false);

    const fileInputRef = useRef(null);

    // ── Initial load ────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await axiosInstance.get("/gmb/connection");
                setConnection(res.data?.connection ?? null);
                setOauthConfigured(res.data?.oauth_configured ?? true);
            } catch {
                setConnection(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Pick up OAuth success/error from query
    useEffect(() => {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        if (url.searchParams.get("gmb_connected") === "1") {
            toast.success("Google Business Profile connected.");
            url.searchParams.delete("gmb_connected");
            window.history.replaceState({}, "", url.toString());
            refreshConnection();
        }
        const err = url.searchParams.get("gmb_error");
        if (err) {
            toast.error(`Google connection failed: ${err}`);
            url.searchParams.delete("gmb_error");
            window.history.replaceState({}, "", url.toString());
        }
    }, []);

    const refreshConnection = async () => {
        try {
            const res = await axiosInstance.get("/gmb/connection");
            setConnection(res.data?.connection ?? null);
        } catch {}
    };

    // ── Tab-driven loaders ──────────────────────────────────────────────
    // Autopost tab works even without a Google connection — gallery + settings
    // are company-scoped, not connection-scoped. Reviews/Posts/Q&A need the
    // connection to be useful, so we skip those when not connected.
    useEffect(() => {
        if (tab === "autopost" || tab === "settings") { loadAutopost(); return; }
        if (!connection) return;
        if (tab === "reviews") loadReviews();
        if (tab === "posts") loadPosts();
        if (tab === "qa") loadQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, connection, reviewFilter.rating, reviewFilter.replied]);

    const loadReviews = async () => {
        try {
            const params = {};
            if (reviewFilter.rating) params.rating = reviewFilter.rating;
            if (reviewFilter.replied !== "all") params.replied = reviewFilter.replied;
            const res = await axiosInstance.get("/gmb/reviews", { params });
            setReviews(res.data?.data ?? []);
        } catch {}
    };

    const loadPosts = async () => {
        try {
            const res = await axiosInstance.get("/gmb/posts");
            setPosts(res.data?.data ?? []);
        } catch {}
    };

    const loadQuestions = async () => {
        try {
            const res = await axiosInstance.get("/gmb/questions");
            setQuestions(res.data?.data ?? []);
        } catch {}
    };

    const loadAutopost = async () => {
        // Each call is independent — settle them separately so a single failure
        // (e.g., migration not run yet, or no Google connection) doesn't leave
        // the whole tab stuck in "Loading…".
        const settled = await Promise.allSettled([
            axiosInstance.get("/gmb/autopost/settings", { suppressErrorToast: true }),
            axiosInstance.get("/gmb/gallery", { suppressErrorToast: true }),
            axiosInstance.get("/gmb/metrics/month", { suppressErrorToast: true }),
            axiosInstance.get("/gmb/posts", { params: { status: "pending_approval" }, suppressErrorToast: true }),
            axiosInstance.get("/gmb/posts", { params: { status: "scheduled" }, suppressErrorToast: true }),
        ]);
        const val = (i) => (settled[i].status === "fulfilled" ? settled[i].value.data : null);
        setSettings(val(0)?.data ?? DEFAULT_SETTINGS);
        setGallery(val(1)?.data ?? []);
        setMonthMetrics(val(2) ?? null);
        setUpcoming([...(val(3)?.data ?? []), ...(val(4)?.data ?? [])]);
    };

    // ── Connect / disconnect / refresh ──────────────────────────────────
    const connect = async () => {
        try {
            const res = await axiosInstance.get("/gmb/auth-url");
            const url = res.data?.url;
            if (url) window.location.href = url;
        } catch {}
    };

    const disconnect = async () => {
        if (!confirm("Disconnect this Google Business Profile?")) return;
        try {
            await axiosInstance.post("/gmb/disconnect");
            setConnection(null);
            toast.success("Disconnected.");
        } catch {}
    };

    const refreshFromGoogle = async () => {
        setRefreshing(true);
        try {
            await axiosInstance.post("/gmb/refresh");
            toast.success("Refreshed from Google.");
            await refreshConnection();
            if (tab === "reviews") loadReviews();
            if (tab === "qa") loadQuestions();
        } catch {} finally {
            setRefreshing(false);
        }
    };

    // ── Connect-banner short-circuit ─────────────────────────────────────
    if (loading) {
        return <div className="gmb-page"><div className="gmb-loading">Loading…</div></div>;
    }

    const isConnected = connection && connection.connection_status === "connected";

    return (
        <div className="gmb-page">
            <Header onRefresh={refreshFromGoogle} refreshing={refreshing} connected={isConnected} />

            {!isConnected && (
                <ConnectBanner
                    oauthConfigured={oauthConfigured}
                    onConnect={connect}
                    status={connection?.connection_status}
                    lastError={connection?.last_error}
                />
            )}

            {isConnected && (
                <>
                    <ProfileCard connection={connection} />
                    <MetricsRow connection={connection} monthMetrics={monthMetrics} />
                </>
            )}

            <div className="gmb-tabs">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        className={`gmb-tab ${tab === t.id ? "active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        {t.id === "reviews" && connection?.review_count
                            ? `Reviews (${connection.review_count})`
                            : t.label}
                    </button>
                ))}
            </div>

            {tab === "reviews" && (
                <ReviewsTab
                    reviews={reviews}
                    filter={reviewFilter}
                    setFilter={setReviewFilter}
                    onChanged={loadReviews}
                />
            )}

            {tab === "posts" && (
                <PostsTab
                    posts={posts}
                    content={postContent}
                    setContent={setPostContent}
                    postType={postType}
                    setPostType={setPostType}
                    publishing={publishing}
                    onPublish={async (publishNow) => {
                        if (!postContent.trim()) {
                            toast.error("Write something first.");
                            return;
                        }
                        setPublishing(true);
                        try {
                            await axiosInstance.post("/gmb/posts", {
                                content: postContent,
                                post_type: postType,
                                publish_now: publishNow,
                            });
                            setPostContent("");
                            toast.success(publishNow ? "Publishing…" : "Draft saved.");
                            loadPosts();
                        } catch {} finally {
                            setPublishing(false);
                        }
                    }}
                />
            )}

            {tab === "autopost" && (
                <AutopostTab
                    settings={settings}
                    setSettings={setSettings}
                    gallery={gallery}
                    monthMetrics={monthMetrics}
                    upcoming={upcoming}
                    fileInputRef={fileInputRef}
                    savingSettings={savingSettings}
                    generatingNow={generatingNow}
                    onSaveSettings={async () => {
                        setSavingSettings(true);
                        try {
                            await axiosInstance.post("/gmb/autopost/settings", settings);
                            toast.success("Settings saved.");
                        } catch {} finally {
                            setSavingSettings(false);
                        }
                    }}
                    onUpload={async (files) => {
                        if (!files?.length) return;
                        const fd = new FormData();
                        Array.from(files).forEach((f) => fd.append("files", f));
                        try {
                            const res = await axiosInstance.post("/gmb/gallery", fd, {
                                headers: { "Content-Type": "multipart/form-data" },
                            });
                            toast.success(`Uploaded ${res.data?.data?.length ?? 0} image(s).`);
                            loadAutopost();
                        } catch {}
                    }}
                    onDeleteImage={async (id) => {
                        if (!confirm("Delete this image from the gallery?")) return;
                        try {
                            await axiosInstance.delete(`/gmb/gallery/${id}`);
                            loadAutopost();
                        } catch {}
                    }}
                    onToggleImageAutopost={async (img) => {
                        try {
                            await axiosInstance.patch(`/gmb/gallery/${img.id}`, {
                                use_for_autopost: !img.use_for_autopost,
                            });
                            loadAutopost();
                        } catch {}
                    }}
                    onGenerateNow={async () => {
                        setGeneratingNow(true);
                        try {
                            await axiosInstance.post("/gmb/autopost/generate-now");
                            toast.success("Draft generated.");
                            loadAutopost();
                        } catch {} finally {
                            setGeneratingNow(false);
                        }
                    }}
                    onApprove={async (postId) => {
                        try {
                            await axiosInstance.post(`/gmb/posts/${postId}/approve`, {});
                            toast.success("Approved — scheduled to publish.");
                            loadAutopost();
                        } catch {}
                    }}
                    onSkip={async (postId) => {
                        try {
                            await axiosInstance.post(`/gmb/posts/${postId}/skip`);
                            loadAutopost();
                        } catch {}
                    }}
                    onDeletePost={async (postId) => {
                        try {
                            await axiosInstance.delete(`/gmb/posts/${postId}`);
                            loadAutopost();
                        } catch {}
                    }}
                />
            )}

            {tab === "qa" && <QATab questions={questions} onChanged={loadQuestions} />}

            {tab === "insights" && (
                <div className="gmb-profile-card">
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1a1f3a", marginBottom: "1rem" }}>
                        Performance Last 30 Days
                    </h3>
                    <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        Insight charts pull from Google Business Profile API once production access is approved.
                        Current month totals are shown above.
                    </p>
                </div>
            )}

            {tab === "settings" && (
                <SettingsTab
                    settings={settings ?? {}}
                    setSettings={setSettings}
                    onSave={async () => {
                        setSavingSettings(true);
                        try {
                            await axiosInstance.post("/gmb/autopost/settings", settings);
                            toast.success("Settings saved.");
                        } catch {} finally {
                            setSavingSettings(false);
                        }
                    }}
                    onDisconnect={disconnect}
                    saving={savingSettings}
                />
            )}
        </div>
    );
};

// ── Header ─────────────────────────────────────────────────────────────────
const Header = ({ onRefresh, refreshing, connected }) => (
    <div className="gmb-header">
        <div className="gmb-title-row">
            <div className="gmb-icon">
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
            </div>
            <div>
                <div className="gmb-title">Google Business Profile</div>
                <div className="gmb-subtitle">Manage reviews, posts, and performance metrics</div>
            </div>
        </div>
        {connected && (
            <button className="gmb-btn-secondary" onClick={onRefresh} disabled={refreshing}>
                {refreshing ? "Refreshing…" : "Refresh from Google"}
            </button>
        )}
    </div>
);

// ── Connect banner ────────────────────────────────────────────────────────
const ConnectBanner = ({ oauthConfigured, onConnect, status, lastError }) => (
    <div className="gmb-connect-banner">
        <div>
            <h2>Connect your Google Business Profile</h2>
            <p>
                Read reviews, AI-draft replies, post storm-response updates, and run
                AI auto-posting — all without leaving ClaimKing.
                {status === "error" && lastError ? (
                    <span style={{ display: "block", marginTop: "0.5rem", color: "#fca5a5" }}>
                        Last error: {lastError}
                    </span>
                ) : null}
                {!oauthConfigured ? (
                    <span style={{ display: "block", marginTop: "0.5rem", color: "#fca5a5" }}>
                        Google OAuth not configured — ask an admin to set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
                    </span>
                ) : null}
            </p>
        </div>
        <button className="gmb-connect-btn" onClick={onConnect} disabled={!oauthConfigured}>
            Connect Google Business Profile
        </button>
    </div>
);

// ── Profile card ──────────────────────────────────────────────────────────
const ProfileCard = ({ connection }) => (
    <div className="gmb-profile-card">
        <div className="gmb-profile-row">
            <div className="gmb-profile-thumb">{initials(connection.location_name ?? "G")}</div>
            <div className="gmb-profile-info">
                <div className="gmb-profile-name">{connection.location_name ?? "(no location selected)"}</div>
                <div className="gmb-profile-meta">
                    {connection.address ?? ""}
                    {connection.phone ? <><br />{connection.phone}</> : null}
                    {connection.website ? <> · {connection.website}</> : null}
                </div>
                {connection.avg_rating ? (
                    <div className="gmb-profile-rating">
                        <span className="gmb-stars">{"★".repeat(Math.round(connection.avg_rating))}{"☆".repeat(5 - Math.round(connection.avg_rating))}</span>
                        <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                            <strong>{connection.avg_rating}</strong>
                            {connection.review_count ? ` based on ${connection.review_count} reviews` : ""}
                        </span>
                    </div>
                ) : null}
            </div>
            <div>
                <div className={`gmb-status ${connection.connection_status === "error" ? "error" : ""}`}>
                    {connection.connection_status === "error" ? "Error" : "Connected"}
                </div>
            </div>
        </div>
    </div>
);

// ── Metrics row ───────────────────────────────────────────────────────────
const MetricsRow = ({ connection, monthMetrics }) => {
    const cells = [
        { label: "Avg Rating", value: connection?.avg_rating ?? "—" },
        { label: "Total Reviews", value: connection?.review_count ?? 0 },
        { label: "Posts This Month", value: monthMetrics?.posts_published ?? 0 },
        { label: "Avg Views / Post", value: monthMetrics?.avg_views_per_post ?? 0 },
        { label: "Profile Clicks", value: monthMetrics?.profile_clicks ?? 0 },
    ];
    return (
        <div className="gmb-metrics-grid">
            {cells.map((c, i) => (
                <div key={i} className="gmb-metric-card">
                    <div className="gmb-metric-label">{c.label}</div>
                    <div className="gmb-metric-value">{c.value}</div>
                </div>
            ))}
        </div>
    );
};

// ── Reviews tab ───────────────────────────────────────────────────────────
const ReviewsTab = ({ reviews, filter, setFilter, onChanged }) => {
    const [replyModal, setReplyModal] = useState(null); // review or null
    const [variants, setVariants] = useState([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [replyText, setReplyText] = useState("");
    const [generating, setGenerating] = useState(false);
    const [posting, setPosting] = useState(false);

    const openReply = async (review) => {
        setReplyModal(review);
        setVariants([]);
        setReplyText(review.reply_text ?? "");
        setSelectedIdx(0);
        setGenerating(true);
        try {
            const res = await axiosInstance.post(`/gmb/reviews/${review.id}/generate-reply`, {});
            const vs = res.data?.variants ?? [];
            setVariants(vs);
            if (vs[0]) setReplyText(vs[0].text);
        } catch {} finally {
            setGenerating(false);
        }
    };

    const submitReply = async () => {
        if (!replyModal) return;
        if (!replyText.trim()) return toast.error("Write a reply first.");
        setPosting(true);
        try {
            await axiosInstance.post(`/gmb/reviews/${replyModal.id}/reply`, { reply_text: replyText });
            toast.success("Reply posted.");
            setReplyModal(null);
            onChanged();
        } catch {} finally {
            setPosting(false);
        }
    };

    return (
        <>
            <div className="gmb-reviews-toolbar">
                <select
                    value={filter.rating}
                    onChange={(e) => setFilter({ ...filter, rating: e.target.value })}
                >
                    <option value="">All star ratings</option>
                    <option value="5">5 stars only</option>
                    <option value="4">4 stars only</option>
                    <option value="3">3 stars only</option>
                    <option value="2">2 stars only</option>
                    <option value="1">1 star only</option>
                </select>
                <select
                    value={filter.replied}
                    onChange={(e) => setFilter({ ...filter, replied: e.target.value })}
                >
                    <option value="all">All</option>
                    <option value="no">Needs reply</option>
                    <option value="yes">Already replied</option>
                </select>
            </div>

            {reviews.length === 0 ? (
                <div className="gmb-empty">No reviews yet. Click "Refresh from Google" to sync.</div>
            ) : reviews.map((r) => (
                <div key={r.id} className="gmb-review-card">
                    <div className="gmb-review-header">
                        <div className="gmb-review-author">
                            <div className="gmb-avatar">{initials(r.reviewer_name)}</div>
                            <div>
                                <div className="gmb-review-name">{r.reviewer_name ?? "Anonymous"}</div>
                                <div className="gmb-review-date">{fmtDate(r.google_create_time)}</div>
                            </div>
                        </div>
                        <div className="gmb-stars">{"★".repeat(r.star_rating)}{"☆".repeat(5 - r.star_rating)}</div>
                    </div>
                    {r.comment ? <div className="gmb-review-body">{r.comment}</div> : null}
                    {r.reply_text ? (
                        <div className="gmb-review-reply">
                            <div className="gmb-reply-label">Your reply · {fmtDate(r.reply_posted_at)}</div>
                            {r.reply_text}
                        </div>
                    ) : (
                        <div className="gmb-review-actions">
                            <button className="gmb-btn-primary" onClick={() => openReply(r)}>
                                ✨ AI Reply
                            </button>
                            <button className="gmb-btn-secondary" onClick={async () => {
                                try { await axiosInstance.post(`/gmb/reviews/${r.id}/mark-read`); onChanged(); } catch {}
                            }}>Mark as Read</button>
                        </div>
                    )}
                </div>
            ))}

            {replyModal && (
                <div className="gmb-modal-backdrop" onClick={() => setReplyModal(null)}>
                    <div className="gmb-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="gmb-modal-header">
                            <h3>Reply to {replyModal.reviewer_name ?? "review"}</h3>
                            <button className="gmb-modal-close" onClick={() => setReplyModal(null)}>×</button>
                        </div>
                        <div className="gmb-modal-body">
                            <div style={{ background: "#f9fafb", padding: "0.75rem 1rem", borderRadius: 6, marginBottom: "1rem", fontSize: "0.85rem", color: "#374151" }}>
                                <strong>{replyModal.star_rating}★</strong> · {replyModal.comment ?? "(no comment)"}
                            </div>
                            {generating ? (
                                <div className="gmb-loading">Generating AI reply variants…</div>
                            ) : variants.length > 0 ? (
                                <>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: "0.5rem" }}>
                                        Pick a variant or edit below
                                    </div>
                                    {variants.map((v, i) => (
                                        <div
                                            key={i}
                                            className={`gmb-variant ${i === selectedIdx ? "selected" : ""}`}
                                            onClick={() => { setSelectedIdx(i); setReplyText(v.text); }}
                                        >
                                            <div className="gmb-variant-tone">{v.tone}</div>
                                            <div className="gmb-variant-text">{v.text}</div>
                                        </div>
                                    ))}
                                </>
                            ) : null}
                            <textarea
                                className="gmb-reply-textarea"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Your reply…"
                            />
                        </div>
                        <div className="gmb-modal-footer">
                            <button className="gmb-btn-secondary" onClick={() => setReplyModal(null)}>Cancel</button>
                            <button className="gmb-btn-primary" disabled={posting} onClick={submitReply}>
                                {posting ? "Posting…" : "Post reply"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ── Posts tab ─────────────────────────────────────────────────────────────
const PostsTab = ({ posts, content, setContent, postType, setPostType, publishing, onPublish }) => (
    <>
        <div className="gmb-composer">
            <div className="gmb-composer-title">Create New Post</div>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.75rem" }}>
                Share storm response updates, special offers, or business news.
            </p>
            <textarea
                className="gmb-composer-textarea"
                value={content}
                maxLength={1500}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What would you like to share?"
            />
            <div className="gmb-composer-footer">
                <span className="gmb-char-count">{content.length} / 1500 characters</span>
                <div className="gmb-composer-actions">
                    <select className="gmb-post-type-select" value={postType} onChange={(e) => setPostType(e.target.value)}>
                        <option value="update">Update</option>
                        <option value="offer">Offer</option>
                        <option value="event">Event</option>
                    </select>
                    <button className="gmb-btn-secondary" disabled={publishing} onClick={() => onPublish(false)}>
                        Save Draft
                    </button>
                    <button className="gmb-btn-primary" disabled={publishing} onClick={() => onPublish(true)}>
                        {publishing ? "Publishing…" : "Publish Now"}
                    </button>
                </div>
            </div>
        </div>

        {posts.length === 0 ? (
            <div className="gmb-empty">No posts yet.</div>
        ) : posts.map((p) => (
            <div key={p.id} className="gmb-post-card">
                <div className="gmb-post-header">
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span className={`gmb-post-type ${p.post_type}`}>{p.post_type}</span>
                        <span className={`gmb-post-badge ${p.status}`}>{p.status.replace("_", " ")}</span>
                    </div>
                    <span className="gmb-post-date">{fmtDate(p.published_at ?? p.created_at)}</span>
                </div>
                <div className="gmb-post-body">{p.content}</div>
                <div className="gmb-post-meta">
                    <span>👁 {p.views_count ?? 0} views</span>
                    <span>🖱 {p.clicks_count ?? 0} clicks</span>
                    <span>📞 {p.calls_count ?? 0} calls</span>
                    {p.error_message ? <span style={{ color: "#dc2626" }}>⚠ {p.error_message}</span> : null}
                </div>
            </div>
        ))}
    </>
);

// ── Autopost tab ──────────────────────────────────────────────────────────
const AutopostTab = ({
    settings, setSettings, gallery, monthMetrics, upcoming, fileInputRef,
    savingSettings, generatingNow,
    onSaveSettings, onUpload, onDeleteImage, onToggleImageAutopost,
    onGenerateNow, onApprove, onSkip, onDeletePost,
}) => {
    if (!settings) return <div className="gmb-loading">Loading…</div>;
    const set = (patch) => setSettings({ ...settings, ...patch });

    return (
        <>
            <div className="gmb-autopost-grid">
                <div className="gmb-autopost-card">
                    <h3>⚙ Auto-Posting Settings</h3>
                    <div className="gmb-toggle-row">
                        <div>
                            <div className="gmb-toggle-label">Enable AI Auto-Posting</div>
                            <div className="gmb-toggle-meta">When on, system posts on schedule using your gallery</div>
                        </div>
                        <button
                            className={`gmb-toggle-switch ${settings.enabled ? "on" : ""}`}
                            onClick={() => set({ enabled: !settings.enabled })}
                            aria-label="Enable auto-posting"
                        />
                    </div>
                    <div className="gmb-toggle-row">
                        <div>
                            <div className="gmb-toggle-label">Require my approval before posting</div>
                            <div className="gmb-toggle-meta">If off, posts go live automatically</div>
                        </div>
                        <button
                            className={`gmb-toggle-switch ${settings.require_approval ? "on" : ""}`}
                            onClick={() => set({ require_approval: !settings.require_approval })}
                            aria-label="Require approval"
                        />
                    </div>

                    <div className="gmb-form-group" style={{ marginTop: "1rem" }}>
                        <label className="gmb-form-label">Posting Schedule</label>
                        <div className="gmb-schedule-grid">
                            <select
                                className="gmb-form-select"
                                value={(settings.schedule_days ?? []).join(",")}
                                onChange={(e) => set({ schedule_days: e.target.value.split(",") })}
                            >
                                <option value="mon,wed,fri">Mon, Wed, Fri</option>
                                <option value="tue,thu">Tue, Thu</option>
                                <option value="mon,tue,wed,thu,fri">Every weekday</option>
                                <option value="sun,mon,tue,wed,thu,fri,sat">Every day</option>
                            </select>
                            <select
                                className="gmb-form-select"
                                value={(settings.post_time ?? "10:00:00").slice(0, 5)}
                                onChange={(e) => set({ post_time: `${e.target.value}:00` })}
                            >
                                <option value="09:00">9:00 AM</option>
                                <option value="10:00">10:00 AM</option>
                                <option value="12:00">12:00 PM</option>
                                <option value="15:00">3:00 PM</option>
                            </select>
                        </div>
                    </div>
                    <div className="gmb-form-group">
                        <label className="gmb-form-label">Caption Style</label>
                        <select
                            className="gmb-form-select"
                            value={settings.caption_style ?? "professional"}
                            onChange={(e) => set({ caption_style: e.target.value })}
                        >
                            <option value="professional">Professional</option>
                            <option value="casual">Casual / Friendly</option>
                            <option value="salesy">Salesy / Direct CTA</option>
                        </select>
                    </div>
                    <div className="gmb-form-group">
                        <label className="gmb-form-label">Call-to-Action Text</label>
                        <input
                            className="gmb-form-input"
                            value={settings.cta_text ?? ""}
                            onChange={(e) => set({ cta_text: e.target.value })}
                        />
                    </div>
                    <div className="gmb-form-group">
                        <label className="gmb-form-label">Default Hashtags (optional)</label>
                        <input
                            className="gmb-form-input"
                            value={settings.hashtags ?? ""}
                            onChange={(e) => set({ hashtags: e.target.value })}
                            placeholder="#roofing #stormdamage"
                        />
                    </div>
                    <button className="gmb-btn-primary" disabled={savingSettings} onClick={onSaveSettings}>
                        {savingSettings ? "Saving…" : "Save Settings"}
                    </button>
                </div>

                <div className="gmb-autopost-card">
                    <h3>📅 This Month</h3>
                    <div className="gmb-month-stats">
                        <Stat label="Posts Published" value={monthMetrics?.posts_published ?? 0} />
                        <Stat label="Avg Views / Post" value={monthMetrics?.avg_views_per_post ?? 0} />
                        <Stat label="Profile Calls" value={monthMetrics?.profile_calls ?? 0} />
                        <Stat label="Profile Clicks" value={monthMetrics?.profile_clicks ?? 0} />
                    </div>
                    <div className="gmb-month-next">
                        <strong>Next post:</strong>{" "}
                        {monthMetrics?.next_post_at ? fmtFutureDate(monthMetrics.next_post_at) : "—"}
                    </div>
                    <button
                        className="gmb-btn-secondary"
                        style={{ marginTop: "1rem" }}
                        disabled={generatingNow}
                        onClick={onGenerateNow}
                    >
                        {generatingNow ? "Generating…" : "✨ Generate one now"}
                    </button>
                </div>
            </div>

            <div className="gmb-gallery-section">
                <div className="gmb-gallery-header">
                    <div>
                        <h3>Image Gallery</h3>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                            {gallery.length} image{gallery.length === 1 ? "" : "s"} · System picks never-used first
                        </div>
                    </div>
                    <button className="gmb-btn-primary" onClick={() => fileInputRef.current?.click()}>
                        + Upload Images
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }}
                    />
                </div>
                <div
                    className="gmb-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); onUpload(e.dataTransfer.files); }}
                >
                    <div style={{ fontSize: "0.875rem", color: "#1a1f3a", fontWeight: 600 }}>
                        Drop images here or click to browse
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                        JPG, PNG, WEBP · Up to 10MB each · Recommended 1200×900px or larger
                    </div>
                </div>
                {gallery.length === 0 ? (
                    <div className="gmb-empty">Upload job-site photos to seed AI auto-posting.</div>
                ) : (
                    <div className="gmb-image-grid">
                        {gallery.map((img) => (
                            <div key={img.id} className="gmb-image-tile">
                                {img.times_posted > 0 && (
                                    <div className="gmb-image-tile-badge">Used {img.times_posted}×</div>
                                )}
                                <AuthedImg s3Key={img.s3_key} alt={img.file_name} />
                                <div className="gmb-image-tile-overlay">
                                    <div className="gmb-image-tile-actions">
                                        <button
                                            className="gmb-image-tile-btn"
                                            onClick={() => onToggleImageAutopost(img)}
                                            title={img.use_for_autopost ? "Pause for autopost" : "Use for autopost"}
                                        >
                                            {img.use_for_autopost ? "Pause" : "Use"}
                                        </button>
                                        <button
                                            className="gmb-image-tile-btn danger"
                                            onClick={() => onDeleteImage(img.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="gmb-upcoming">
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1f3a", marginBottom: "1rem" }}>
                    Upcoming &amp; Pending Approval
                </h3>
                {upcoming.length === 0 ? (
                    <div className="gmb-empty">Nothing scheduled.</div>
                ) : upcoming.map((p) => (
                    <div key={p.id} className="gmb-preview-card">
                        <div className="gmb-preview-image">
                            {p.media_urls?.[0] ? (
                                <AuthedImg s3Key={p.media_urls[0]} alt="" />
                            ) : (
                                <span>Image<br />Preview</span>
                            )}
                        </div>
                        <div className="gmb-preview-body">
                            <div className="gmb-preview-meta">
                                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280" }}>
                                    {p.scheduled_for ? fmtFutureDate(p.scheduled_for) : "Unscheduled"}
                                </span>
                                <span className={`gmb-post-badge ${p.status}`}>{p.status.replace("_", " ")}</span>
                            </div>
                            <div className="gmb-preview-caption">{p.content}</div>
                            <div className="gmb-preview-actions">
                                {p.status === "pending_approval" && (
                                    <button className="gmb-preview-btn approve" onClick={() => onApprove(p.id)}>
                                        Approve &amp; Schedule
                                    </button>
                                )}
                                <button className="gmb-preview-btn" onClick={() => onSkip(p.id)}>Skip</button>
                                <button className="gmb-preview-btn" onClick={() => onDeletePost(p.id)}>Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

const Stat = ({ label, value }) => (
    <div>
        <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
            {label}
        </div>
        <div style={{ fontSize: "1.875rem", fontWeight: 700, color: "#1a1f3a" }}>{value}</div>
    </div>
);

// ── Q&A tab ───────────────────────────────────────────────────────────────
const QATab = ({ questions, onChanged }) => {
    const [answering, setAnswering] = useState(null);
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);
    const submit = async () => {
        if (!answering || !text.trim()) return toast.error("Write an answer first.");
        setSaving(true);
        try {
            await axiosInstance.post(`/gmb/questions/${answering.id}/answer`, { answer_text: text });
            toast.success("Answer posted.");
            setAnswering(null);
            setText("");
            onChanged();
        } catch {} finally {
            setSaving(false);
        }
    };
    return (
        <>
            {questions.length === 0 ? (
                <div className="gmb-empty">No questions yet.</div>
            ) : questions.map((q) => (
                <div key={q.id} className="gmb-review-card">
                    <div className="gmb-review-header">
                        <div className="gmb-review-author">
                            <div className="gmb-avatar">?</div>
                            <div>
                                <div className="gmb-review-name">Asked by {q.asker_name ?? "someone"}</div>
                                <div className="gmb-review-date">
                                    {fmtDate(q.google_create_time)}
                                    {q.upvote_count ? ` · ${q.upvote_count} people want to know` : ""}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="gmb-review-body"><strong>{q.question_text}</strong></div>
                    {q.answer_text ? (
                        <div className="gmb-review-reply">
                            <div className="gmb-reply-label">Your answer · {fmtDate(q.answered_at)}</div>
                            {q.answer_text}
                        </div>
                    ) : (
                        <div className="gmb-review-actions">
                            <button className="gmb-btn-primary" onClick={() => { setAnswering(q); setText(""); }}>
                                Answer
                            </button>
                        </div>
                    )}
                </div>
            ))}

            {answering && (
                <div className="gmb-modal-backdrop" onClick={() => setAnswering(null)}>
                    <div className="gmb-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="gmb-modal-header">
                            <h3>Answer question</h3>
                            <button className="gmb-modal-close" onClick={() => setAnswering(null)}>×</button>
                        </div>
                        <div className="gmb-modal-body">
                            <div style={{ background: "#f9fafb", padding: "0.75rem 1rem", borderRadius: 6, marginBottom: "1rem", fontSize: "0.9rem", color: "#1a1f3a", fontWeight: 600 }}>
                                {answering.question_text}
                            </div>
                            <textarea
                                className="gmb-reply-textarea"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Your answer…"
                            />
                        </div>
                        <div className="gmb-modal-footer">
                            <button className="gmb-btn-secondary" onClick={() => setAnswering(null)}>Cancel</button>
                            <button className="gmb-btn-primary" disabled={saving} onClick={submit}>
                                {saving ? "Posting…" : "Post answer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ── Settings tab ──────────────────────────────────────────────────────────
const SettingsTab = ({ settings, setSettings, onSave, onDisconnect, saving }) => {
    const set = (patch) => setSettings({ ...settings, ...patch });
    return (
        <div className="gmb-profile-card">
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1a1f3a", marginBottom: "0.5rem" }}>
                Auto-Reply Settings
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
                Configure how AI handles incoming reviews automatically.
            </p>
            <div className="gmb-toggle-row">
                <div>
                    <div className="gmb-toggle-label">Auto-draft replies for 5-star reviews</div>
                    <div className="gmb-toggle-meta">Drafts queued for your approval before posting</div>
                </div>
                <button
                    className={`gmb-toggle-switch ${settings.auto_reply_5star ? "on" : ""}`}
                    onClick={() => set({ auto_reply_5star: !settings.auto_reply_5star })}
                />
            </div>
            <div className="gmb-toggle-row">
                <div>
                    <div className="gmb-toggle-label">Alert admin via SMS for 1–2 star reviews</div>
                    <div className="gmb-toggle-meta">Requires SMS Setup on the Email/SMS page</div>
                </div>
                <button
                    className={`gmb-toggle-switch ${settings.alert_low_star_sms ? "on" : ""}`}
                    onClick={() => set({ alert_low_star_sms: !settings.alert_low_star_sms })}
                />
            </div>
            {settings.alert_low_star_sms && (
                <div className="gmb-form-group" style={{ marginTop: "1rem" }}>
                    <label className="gmb-form-label">SMS alert number</label>
                    <input
                        className="gmb-form-input"
                        value={settings.alert_low_star_number ?? ""}
                        onChange={(e) => set({ alert_low_star_number: e.target.value })}
                        placeholder="+15555551234"
                    />
                </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button className="gmb-btn-primary" disabled={saving} onClick={onSave}>
                    {saving ? "Saving…" : "Save settings"}
                </button>
                <button className="gmb-btn-secondary" onClick={onDisconnect}>
                    Disconnect Google Business Profile
                </button>
            </div>
        </div>
    );
};

export default GoogleMyBusinessPage;
