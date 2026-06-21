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
  category: string
  readTime: string
  keywords: string[]
}

export interface Post extends PostMeta {
  content: string
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
  const processed = await remark().use(remarkHtml).process(content)
  return { slug, ...(data as Omit<PostMeta, "slug">), content: processed.toString() }
}
