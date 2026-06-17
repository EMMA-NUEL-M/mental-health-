import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sage-600 font-medium tracking-wide uppercase text-xs mb-4">
        For students, by students
      </p>
      <h1 className="font-display text-4xl sm:text-5xl text-ink-900 max-w-xl leading-tight">
        Talk it through with someone who gets it
      </h1>
      <p className="mt-5 max-w-md text-ink-700">
        Confide pairs you with another student, anonymously, to talk
        through exam stress, homesickness, or whatever else is on your
        mind &mdash; or to be the one who listens.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup" className="btn-primary">
          Get started
        </Link>
        <Link href="/login" className="btn-secondary">
          I already have an account
        </Link>
      </div>
      <p className="mt-10 text-sm text-ink-500 max-w-sm">
        Confide is peer support, not professional therapy. If you're in
        crisis, please contact your campus counseling center or a local
        crisis line directly.
      </p>
    </main>
  );
}
