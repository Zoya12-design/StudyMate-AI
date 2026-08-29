/**
 * Markdown renderer for assistant messages.
 *
 * Extracted from ChatInterface in FE-08 so the chat component stays readable
 * next to its new error/empty/loading states. Behaviour is unchanged: model
 * output is rendered as markdown nodes, never as raw HTML, so a half-finished
 * token can never break the page while it is still streaming.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="study-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-1 text-xl font-bold leading-tight">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-lg font-bold leading-tight">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-base font-bold">{children}</h3>
          ),

          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,

          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),

          em: ({ children }) => <em className="italic">{children}</em>,

          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>
          ),

          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>
          ),

          li: ({ children }) => <li className="pl-1">{children}</li>,

          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");

            if (isBlock) {
              return (
                <code
                  className={`${className ?? ""} block whitespace-pre-wrap font-mono text-sm`}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px] text-neutral-800">
                {children}
              </code>
            );
          },

          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-sm leading-6 text-neutral-100">
              {children}
            </pre>
          ),

          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-neutral-300 pl-4 italic text-neutral-600">
              {children}
            </blockquote>
          ),

          hr: () => <hr className="my-4 border-neutral-200" />,

          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2 hover:opacity-70"
            >
              {children}
            </a>
          ),

          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),

          thead: ({ children }) => (
            <thead className="bg-neutral-100">{children}</thead>
          ),

          th: ({ children }) => (
            <th className="border-b border-neutral-200 px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border-b border-neutral-100 px-3 py-2">{children}</td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
