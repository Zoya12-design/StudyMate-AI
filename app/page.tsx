import Link from "next/link";
import AuroraStudyHero from "@/components/hero/AuroraStudyHero";

export const metadata = {
  title: "Zoya | AI Developer — StudyMate AI",
  description:
    "AI developer building web applications, including StudyMate AI — an AI study assistant that helps students understand concepts, prep for exams, and debug their thinking through streaming AI conversations.",
  openGraph: {
    title: "Zoya | AI Developer — StudyMate AI",
    description:
      "AI-powered study assistant with streaming chat, concept lookup via tool calling, and reliability-tested failure handling. Built with Next.js, React, and TypeScript.",
    url: "https://study-mate-ai-lilac.vercel.app",
    siteName: "Zoya — AI Developer",
    images: [
      {
        url: "https://study-mate-ai-lilac.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "StudyMate AI — AI Study Assistant",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zoya | AI Developer — StudyMate AI",
    description:
      "AI-powered study assistant with streaming chat, concept lookup, and reliability-tested failure handling.",
    images: ["https://study-mate-ai-lilac.vercel.app/og-image.png"],
  },
};

export default function Home() {
  return (
    <main>
      <AuroraStudyHero
        eyebrow="Zoya — AI Developer"
        headline="Hi, I’m Zoya."
        subline="I build AI-powered web applications, especially tools that help students learn, revise, and solve problems more effectively."
      />

      <section className="bg-[#0B1220] px-6 py-10 text-center">
        <p className="mb-4 text-xs uppercase tracking-widest text-[#A9B4C2]">
          Built with
        </p>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-3">
          {["Next.js", "React", "TypeScript", "AI Integration"].map(
            (skill) => (
              <span
                key={skill}
                className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm text-white"
              >
                {skill}
              </span>
            )
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-3xl font-bold text-neutral-900">What I Built</h2>

        <div className="mt-8 rounded-2xl border p-8 shadow-sm bg-white">
          <h3 className="text-2xl font-semibold">StudyMate AI</h3>

          <p className="mt-3 text-gray-600">
            An AI study assistant that helps students understand concepts,
            prepare for exams, debug their thinking, and explore topics
            through interactive AI conversations.
          </p>

          <p className="mt-5 font-medium">
            Built with: Next.js, React, TypeScript, and AI integration.
          </p>

          <ul className="mt-5 list-disc space-y-2 pl-5 text-gray-600">
            <li>Streaming AI chat experience</li>
            <li>Concept lookup with tool calling</li>
            <li>Reliability testing and failure states</li>
            <li>Responsive mobile-friendly interface</li>
          </ul>

          <Link
            href="/chat"
            className="mt-6 inline-block rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-800"
          >
            Try StudyMate AI →
          </Link>

          <a
            href="https://github.com/Zoya12-design"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 ml-3 inline-block rounded-lg border px-6 py-3 font-medium text-neutral-800 transition hover:bg-neutral-50"
          >
            View My GitHub →
          </a>
        </div>
      </section>
    </main>
  );
}