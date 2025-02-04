// @ts-expect-error
import { readJson } from 'fs-extra/esm'
import type { Rule, SearchItem } from '@any-reader/core'
import { JSONFilePreset } from 'lowdb/node'
import type { Low } from 'lowdb/lib'

export interface RecordFileRow extends SearchItem {
  ruleId: string
  createTime: number
}

const MAX_LENGTH = 100

export class RecordFile {
  filePath: string
  db!: Low<RecordFileRow[]>

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async getDb() {
    if (this.db)
      return this.db
    const data = await readJson(this.filePath).catch(() => ([]))
    this.db = await JSONFilePreset<RecordFileRow[]>(this.filePath, data)
    return this.db
  }

  // 获取所有记录
  async list() {
    const db = await this.getDb()
    return db.data
  }

  // 保存配置文件
  async writeFile() {
    const db = await this.getDb()
    db.write()
  }

  // 删除记录
  async del(item: SearchItem, rule: Rule, saveFile = true) {
    const db = await this.getDb()
    db.data = db.data.filter(e => !(e.ruleId === rule.id && e.url === item.url))
    if (saveFile)
      await this.writeFile()
    return true
  }

  // 添加记录
  async add(item: SearchItem, rule: Rule) {
    const db = await this.getDb()
    if (db.data.length > MAX_LENGTH)
      db.data.splice(MAX_LENGTH)

    this.del(item, rule, false)
    db.data.unshift({
      ...item,
      ruleId: rule.id,
      createTime: Date.now(),
    })
    await this.writeFile()
  }

  // 是否存在
  async has(rule: Rule, url: string) {
    const db = await this.getDb()
    return db.data.find(e => e.ruleId === rule.id && e.url === url)
  }
}
