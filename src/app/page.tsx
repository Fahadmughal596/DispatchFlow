import Link from "next/link";
import {
  ArrowRight,
  CirclePlay,
  FileText,
  Headphones,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Truck,
  Zap,
} from "@/components/landing-icons";

const features = [
  {
    icon: Truck,
    title: "Manage Loads",
    text: "See assigned loads, updates, pickup details, and delivery status in one place.",
  },
  {
    icon: FileText,
    title: "Documents",
    text: "Upload permits, insurance, W-9, and other required documents without chasing messages.",
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    text: "Stay connected with your dispatcher directly from the portal.",
  },
  {
    icon: ReceiptText,
    title: "Invoices",
    text: "Track invoices, due dates, and payment status without confusion.",
  },
];

const miniBenefits = [
  { icon: Zap, title: "Easy to Use", text: "Simple & intuitive" },
  { icon: ShieldCheck, title: "Secure Portal", text: "Your data stays safe" },
  { icon: Headphones, title: "24/7 Support", text: "Help when you need it" },
];

export default function LandingPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <nav className="navbar">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Truck size={24} strokeWidth={2.4} />
            </span>
            <span>DispatchFlow</span>
          </Link>

          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#truckers">For Truckers</a>
            <a href="#how">How It Works</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="nav-actions">
            <Link href="/login" className="nav-cta single-login">
              Login / Sign In
            </Link>
          </div>
        </nav>

        <div className="hero-content">
          <div className="hero-copy">
            <div className="eyebrow">
              <ShieldCheck size={18} />
              Built for Truckers. Backed by Dispatchers.
            </div>

            <h1>
              Run Your Business.
              <br />
              We Handle the <span>Rest.</span>
            </h1>

            <p>
              DispatchFlow connects truckers with dispatch support in one clean
              portal. Manage loads, documents, invoices, and communication
              without jumping between apps.
            </p>

            <div className="hero-buttons">
              <Link href="/login" className="primary-btn">
                Login to Portal <ArrowRight size={20} />
              </Link>
              <a href="#how" className="secondary-btn">
                See How It Works <CirclePlay size={20} />
              </a>
            </div>

            <div className="benefit-row">
              {miniBenefits.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="mini-benefit" key={item.title}>
                    <span><Icon size={20} /></span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.text}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="dashboard-card" aria-label="Dashboard preview">
            <div className="dashboard-header">
              <span>Your Dashboard</span>
              <span className="status-dot">Online</span>
            </div>

            <div className="driver-card">
              <div className="avatar">MA</div>
              <div>
                <small>Assigned Dispatcher</small>
                <strong>Mike Anderson</strong>
              </div>
              <button>Chat</button>
            </div>

            <div className="dash-grid">
              <div>
                <small>Current Load</small>
                <strong>Dallas → Chicago</strong>
                <span>In Transit</span>
              </div>
              <div>
                <small>Missing Docs</small>
                <strong>2 Pending</strong>
                <span className="warning">Upload Now</span>
              </div>
              <div>
                <small>Invoice Due</small>
                <strong>$3,250</strong>
                <span>Due in 5 days</span>
              </div>
            </div>

            <div className="progress-card">
              <div>
                <span>Onboarding Progress</span>
                <strong>80%</strong>
              </div>
              <div className="progress-track"><i /></div>
            </div>
          </aside>
        </div>

        <div className="feature-strip" id="features">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div className="strip-item" key={item.title}>
                <Icon size={36} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="trust-section" id="truckers">
        <p>Built for truckers who want less confusion and more control</p>
        <div className="trust-stats">
          <div>
            <strong>One Portal</strong>
            <span>Everything together</span>
          </div>
          <div>
            <strong>Real Updates</strong>
            <span>No more chasing</span>
          </div>
          <div>
            <strong>Mobile Ready</strong>
            <span>Works on the road</span>
          </div>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="section-heading">
          <span>Simple workflow</span>
          <h2>How DispatchFlow works</h2>
        </div>

        <div className="steps">
          {[
            ["01", "Create Account", "Sign up and complete your trucker profile."],
            ["02", "Get Connected", "Your dispatcher gets assigned and starts guiding you."],
            ["03", "Manage Everything", "Track documents, loads, invoices, and messages."],
            ["04", "Keep Moving", "Stay focused on the road while your workflow stays organized."],
          ].map(([num, title, text]) => (
            <div className="step-card" key={num}>
              <span>{num}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="final-cta" id="contact">
        <div>
          <h2>
            Keep Moving Forward.
            <br />
            <span>We’ll Handle the Rest.</span>
          </h2>
          <p>
            A clean, mobile-friendly portal experience for truckers who want to
            stay organized and ready for the next load.
          </p>
        </div>
        <Link href="/login" className="primary-btn">
          Login Free <ArrowRight size={20} />
        </Link>
      </section>

      <footer className="footer">
        <Link href="/" className="brand">
          <span className="brand-mark"><Truck size={22} strokeWidth={2.4} /></span>
          <span>DispatchFlow</span>
        </Link>
        <p>Built for truckers. Backed by dispatchers.</p>
      </footer>

      <style>{`
        .page-shell { min-height: 100vh; overflow-x: hidden; background: #080b16; }

        .hero {
          position: relative;
          min-height: 100vh;
          padding: 0 0 34px;
          overflow: hidden;
          isolation: isolate;
        }

        .hero-image {
          position: absolute;
          inset: 0;
          background-image: url("/images/truck-hero-hd.jpg");
          background-size: cover;
          background-position: center right;
          transform: scale(1.035);
          animation: heroDrift 14s ease-in-out infinite alternate;
          z-index: -4;
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(4, 7, 18, 0.96) 0%, rgba(7, 9, 21, 0.88) 32%, rgba(7, 9, 21, 0.35) 66%, rgba(7, 9, 21, 0.18) 100%),
            linear-gradient(180deg, rgba(4, 7, 18, 0.28) 0%, rgba(4, 7, 18, 0.64) 72%, #080b16 100%);
          z-index: -3;
        }

        .hero-glow {
          position: absolute;
          width: 360px;
          height: 360px;
          border-radius: 999px;
          filter: blur(70px);
          opacity: 0.55;
          z-index: -2;
          animation: glowPulse 6s ease-in-out infinite;
        }

        .hero-glow-one { top: 12%; left: 3%; background: rgba(168, 85, 247, 0.45); }
        .hero-glow-two { right: 14%; bottom: 14%; background: rgba(56, 189, 248, 0.32); animation-delay: 1.4s; }

        .navbar {
          width: min(1180px, calc(100% - 40px));
          height: 86px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
          position: relative;
          z-index: 20;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #8b5cf6, #d946ef);
          box-shadow: 0 0 34px rgba(168, 85, 247, 0.45);
        }

        .nav-links { display: flex; align-items: center; gap: 34px; color: rgba(255,255,255,.86); font-weight: 700; }
        .nav-links a { text-decoration: none; transition: color .2s ease; }
        .nav-links a:hover { color: #d8b4fe; }

        .nav-actions { display: flex; align-items: center; gap: 12px; }

        .nav-login, .nav-cta {
          text-decoration: none;
          font-weight: 800;
          border-radius: 12px;
          padding: 13px 22px;
          color: white;
        }

        .nav-login {
          border: 1px solid rgba(255,255,255,.22);
          background: rgba(255,255,255,.06);
          backdrop-filter: blur(14px);
        }

        .nav-cta, .primary-btn {
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          box-shadow: 0 16px 46px rgba(124,58,237,.36);
        }

        .hero-content {
          width: min(1180px, calc(100% - 40px));
          min-height: 610px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, .96fr) minmax(380px, .72fr);
          gap: 46px;
          align-items: center;
          position: relative;
          z-index: 5;
          padding: 34px 0 36px;
        }

        .hero-copy { animation: fadeUp .9s ease both; }

        .eyebrow {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          color: #f0abfc;
          background: rgba(168,85,247,.14);
          border: 1px solid rgba(217,70,239,.34);
          font-weight: 800;
          margin-bottom: 24px;
        }

        h1 {
          max-width: 590px;
          font-size: clamp(52px, 7vw, 88px);
          line-height: .98;
          letter-spacing: -0.07em;
          margin: 0;
        }

        h1 span, .final-cta span { color: #d946ef; }

        .hero-copy p {
          max-width: 560px;
          color: rgba(255,255,255,.82);
          font-size: 20px;
          line-height: 1.65;
          margin: 26px 0 30px;
        }

        .hero-buttons { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

        .primary-btn, .secondary-btn {
          min-height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border-radius: 13px;
          padding: 0 28px;
          color: white;
          text-decoration: none;
          font-weight: 900;
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }

        .primary-btn:hover, .secondary-btn:hover { transform: translateY(-3px); }

        .secondary-btn {
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.2);
          backdrop-filter: blur(12px);
        }

        .benefit-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-top: 38px;
          max-width: 720px;
        }

        .mini-benefit { display: flex; align-items: center; gap: 14px; }
        .mini-benefit > span {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(168,85,247,.16);
          color: #d8b4fe;
        }
        .mini-benefit strong, .mini-benefit small { display: block; }
        .mini-benefit small { color: rgba(255,255,255,.68); margin-top: 3px; }

        .dashboard-card {
          justify-self: end;
          width: min(100%, 430px);
          padding: 18px;
          border-radius: 22px;
          background: rgba(8,13,32,.7);
          border: 1px solid rgba(255,255,255,.18);
          backdrop-filter: blur(18px);
          box-shadow: 0 30px 90px rgba(0,0,0,.42);
          animation: cardFloat 5s ease-in-out infinite, fadeUp 1s ease .1s both;
        }

        .dashboard-header, .progress-card > div:first-child {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dashboard-header { margin-bottom: 14px; font-weight: 900; }
        .status-dot { color: #4ade80; font-size: 13px; }

        .driver-card, .dash-grid > div, .progress-card {
          border-radius: 15px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.1);
        }

        .driver-card {
          display: grid;
          grid-template-columns: 48px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 14px;
          margin-bottom: 12px;
        }

        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #fb923c, #7c3aed);
          font-weight: 900;
        }

        .driver-card small, .dash-grid small { color: rgba(255,255,255,.64); }
        .driver-card strong, .dash-grid strong { display: block; margin-top: 2px; }

        .driver-card button {
          border: 0;
          color: white;
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(56,189,248,.2);
          font-weight: 800;
        }

        .dash-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .dash-grid > div { padding: 14px; }
        .dash-grid span {
          display: inline-block;
          margin-top: 8px;
          color: #93c5fd;
          font-weight: 800;
          font-size: 13px;
        }
        .dash-grid .warning { color: #fb7185; }

        .progress-card { padding: 14px; margin-top: 12px; }
        .progress-card span { color: rgba(255,255,255,.78); font-weight: 800; }

        .progress-track {
          height: 10px;
          margin-top: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.12);
          overflow: hidden;
        }
        .progress-track i {
          display: block;
          width: 80%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #a855f7, #38bdf8);
        }

        .feature-strip {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: rgba(8,13,32,.78);
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 20px;
          backdrop-filter: blur(16px);
          position: relative;
          z-index: 8;
          overflow: hidden;
          animation: fadeUp 1s ease .18s both;
        }

        .strip-item {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 28px;
          border-right: 1px solid rgba(255,255,255,.12);
        }
        .strip-item:last-child { border-right: 0; }
        .strip-item svg { color: #d946ef; flex: 0 0 auto; }
        .strip-item h3 { margin: 0 0 6px; font-size: 18px; }
        .strip-item p { margin: 0; color: rgba(255,255,255,.7); line-height: 1.45; }

        .trust-section, .how-section, .final-cta, .footer {
          width: min(1180px, calc(100% - 40px));
          margin-inline: auto;
        }

        .trust-section { padding: 60px 0 30px; text-align: center; }
        .trust-section > p { margin: 0 0 24px; color: #d9d4e8; font-size: 18px; }

        .trust-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .trust-stats div, .step-card, .final-cta {
          border-radius: 20px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.12);
        }
        .trust-stats div { padding: 24px; }
        .trust-stats strong, .trust-stats span { display: block; }
        .trust-stats strong { font-size: 24px; margin-bottom: 4px; }
        .trust-stats span, .step-card p, .final-cta p, .footer p { color: rgba(255,255,255,.68); }

        .how-section { padding: 42px 0 42px; }
        .section-heading { text-align: center; margin-bottom: 28px; }
        .section-heading span {
          color: #d8b4fe;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 12px;
          font-weight: 900;
        }
        .section-heading h2 {
          margin: 10px 0 0;
          font-size: clamp(32px, 4vw, 48px);
          letter-spacing: -0.04em;
        }

        .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .step-card { padding: 26px; }
        .step-card span {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: white;
          background: rgba(168,85,247,.18);
          border: 1px solid rgba(216,180,254,.35);
          font-weight: 900;
          margin-bottom: 18px;
        }
        .step-card h3 { margin: 0 0 8px; }
        .step-card p { margin: 0; line-height: 1.55; }

        .final-cta {
          margin-top: 30px;
          padding: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          background: linear-gradient(135deg, rgba(168,85,247,.16), rgba(56,189,248,.08)), rgba(255,255,255,.055);
        }

        .final-cta h2 {
          margin: 0;
          font-size: clamp(34px, 4vw, 54px);
          line-height: 1.04;
          letter-spacing: -0.05em;
        }

        .final-cta p { max-width: 560px; font-size: 18px; line-height: 1.65; }

        .footer {
          padding: 38px 0 50px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @keyframes heroDrift {
          from { transform: scale(1.035) translate3d(0,0,0); }
          to { transform: scale(1.075) translate3d(-18px,-6px,0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glowPulse {
          0%,100% { opacity: .4; transform: scale(1); }
          50% { opacity: .7; transform: scale(1.08); }
        }

        @media (max-width: 1080px) {
          .hero-content { grid-template-columns: 1fr; }
          .dashboard-card { justify-self: start; width: 100%; max-width: 520px; }
          .feature-strip { grid-template-columns: repeat(2, 1fr); }
          .strip-item:nth-child(2) { border-right: 0; }
          .strip-item:nth-child(1), .strip-item:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,.12); }
          .steps { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 780px) {
          .nav-links { display: none; }
          .nav-cta { display: none; }
          .navbar { height: 74px; }
          .hero { min-height: auto; }
          .hero-image { background-position: 62% center; }
          .hero-shade {
            background:
              linear-gradient(180deg, rgba(4,7,18,.62) 0%, rgba(4,7,18,.92) 58%, #080b16 100%),
              linear-gradient(90deg, rgba(4,7,18,.88), rgba(4,7,18,.26));
          }
          .hero-content { min-height: auto; padding: 64px 0 28px; }
          .benefit-row, .feature-strip, .trust-stats, .steps { grid-template-columns: 1fr; }
          .strip-item, .strip-item:nth-child(2) { border-right: 0; border-bottom: 1px solid rgba(255,255,255,.12); }
          .strip-item:last-child { border-bottom: 0; }
          .final-cta, .footer { flex-direction: column; align-items: flex-start; }
        }

        @media (max-width: 520px) {
          .navbar, .hero-content, .feature-strip, .trust-section, .how-section, .final-cta, .footer {
            width: min(100% - 26px, 1180px);
          }
          .brand { font-size: 20px; }
          .brand-mark { width: 36px; height: 36px; }
          h1 { font-size: 50px; }
          .hero-copy p { font-size: 17px; }
          .hero-buttons { flex-direction: column; align-items: stretch; }
          .primary-btn, .secondary-btn { width: 100%; }
          .dashboard-card { padding: 14px; }
          .driver-card { grid-template-columns: 42px 1fr; }
          .driver-card button { grid-column: 1 / -1; }
        }


        @media (max-width: 390px) {
          .navbar,
          .hero-content,
          .feature-strip,
          .trust-section,
          .how-section,
          .final-cta,
          .footer {
            width: min(100% - 20px, 1180px);
          }

          .brand span:last-child {
            font-size: 17px;
          }

          .nav-cta {
            padding: 10px 12px;
            font-size: 12px;
            min-width: auto;
          }

          h1 {
            font-size: 39px;
          }

          .hero-content {
            padding-top: 34px;
          }

          .dashboard-card {
            display: none;
          }
        }

      `}</style>
    </main>
  );
}
