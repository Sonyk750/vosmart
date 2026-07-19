import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { remark } from "remark"
import remarkHtml from "remark-html"

const postsDir = path.join(process.cwd(), "content/blog")

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string
  dateModified?: string
  category: string
  readTime: string
  keywords: string[]
}

export interface FaqItem {
  question: string
  answer: string
}

export interface Post extends PostMeta {
  content: string
  faqs: FaqItem[]
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(postsDir)) return []
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith(".md"))
  return files
    .map(file => {
      const raw = fs.readFileSync(path.join(postsDir, file), "utf8")
      const { data } = matter(raw)
      return { slug: file.replace(/\.md$/, ""), ...(data as Omit<PostMeta, "slug">) }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getPost(slug: string): Promise<Post | null> {
  const filePath = path.join(postsDir, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, "utf8")
  const { data, content } = matter(raw)
  const faqs = extractFaqs(content)
  const processed = await remark().use(remarkHtml).process(content)
  return { slug, ...(data as Omit<PostMeta, "slug">), content: processed.toString(), faqs }
}

// Articole similare pentru linking intern — scor pe categorie + cuvinte-cheie comune.
export function getRelatedPosts(slug: string, limit = 3): PostMeta[] {
  const all = getAllPosts()
  const current = all.find(p => p.slug === slug)
  const others = all.filter(p => p.slug !== slug)
  if (!current) return others.slice(0, limit)

  const currentKeywords = new Set((current.keywords || []).map(k => k.toLowerCase()))
  return others
    .map(post => {
      let score = post.category === current.category ? 2 : 0
      for (const k of post.keywords || []) if (currentKeywords.has(k.toLowerCase())) score += 1
      return { post, score }
    })
    .sort((a, b) => b.score - a.score || new Date(b.post.date).getTime() - new Date(a.post.date).getTime())
    .slice(0, limit)
    .map(x => x.post)
}

// Curata markdown-ul pentru textul din schema (link-uri, bold etc.).
function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Extrage perechile intrebare/raspuns din sectiunea "Intrebari frecvente" a articolului.
function extractFaqs(markdown: string): FaqItem[] {
  const lines = markdown.split(/\r?\n/)
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+.*[iî]ntreb[aă]ri\s+frecvente/i.test(lines[i])) {
      start = i + 1
      break
    }
  }
  if (start === -1) return []

  const faqs: FaqItem[] = []
  let question: string | null = null
  let answer: string[] = []
  const flush = () => {
    if (question) {
      const text = stripMarkdown(answer.join(" "))
      if (text) faqs.push({ question: stripMarkdown(question), answer: text })
    }
    question = null
    answer = []
  }

  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    if (/^##\s+/.test(line) || /^---\s*$/.test(line)) break
    const q = line.match(/^\*\*(.+?)\*\*\s*$/)
    if (q) {
      flush()
      question = q[1]
      continue
    }
    if (question && line.trim()) answer.push(line.trim())
  }
  flush()
  return faqs
}
