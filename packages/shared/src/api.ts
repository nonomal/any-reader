import { merge } from 'lodash-es'

// @ts-expect-error
import { ensureFileSync, readJSONSync, writeJSONSync } from 'fs-extra/esm'
import type { Rule } from '@any-reader/core'
import { ContentType, RuleManager } from '@any-reader/core'
import * as ruleFileManager from './ruleFileManager'
import * as ruleExtraManager from './ruleExtraManager'
import { favoritesManager } from './favoritesManager'
import { historyManager } from './historyManager'
import type { BookChapter } from './localBookManager'
import localBookManager from './localBookManager'
import { LOCAL_BOOK_DIR } from './constants'

// 发现页分类
async function discoverMap(ruleId: string) {
  const rule = await ruleFileManager.findById(ruleId)
  const ruleManager = new RuleManager(rule)
  return ruleManager.discoverMap()
}

/**
 * 发现页列表
 * @returns
 */
async function discover({ ruleId, data }: any) {
  const rule = await ruleFileManager.findById(ruleId)
  const ruleManager = new RuleManager(rule)
  return ruleManager.discover(data.value)
}

/**
 * 收藏列表
 * @returns
 */
function getFavorites() {
  return favoritesManager.list()
}

/**
 * 历史记录
 * @returns
 */
function getHistory() {
  return historyManager.list()
}

/**
 * 本地书籍
 * @returns
 */
function getLocalBooks(dir: string) {
  return localBookManager.getBookList(dir)
}

/**
 * 收藏
 * @param param0
 * @returns
 */
async function star({ data, ruleId }: any) {
  await favoritesManager.add(data, await ruleFileManager.findById(ruleId))
  return true
}

/**
 * 取消收藏
 * @returns
 */
async function unstar({ data, ruleId }: any) {
  await favoritesManager.del(data, await ruleFileManager.findById(ruleId))
  return true
}

/**
 * 规则列表
 * @returns
 */
function rules() {
  return ruleFileManager.list()
}

function batchUpdateRules(data: { ids: string[]; rule: Rule }) {
  return ruleFileManager.batchUpdate(data)
}

/**
 * 根据规则ID获取规则
 * @param ruleId
 * @returns
 */
async function getRuleById(ruleId: string) {
  const rules = await ruleFileManager.list()
  return rules.find(e => e.id === ruleId)
}

/**
 * 创建规则
 * @param data
 * @returns
 */
function createRule(data: Rule) {
  return ruleFileManager.update(data)
}

/**
 * 更新规则
 * @param data
 * @returns
 */
async function updateRule(data: Rule) {
  await ruleFileManager.update(data)
  return data
}

/**
 * 搜索
 * @returns
 */
async function searchByRuleId({ ruleId, keyword }: { ruleId: string; keyword: string }) {
  const rule = await ruleFileManager.findById(ruleId)
  const analyzer = new RuleManager(rule)
  return await analyzer.search(keyword).catch(() => [])
}

/**
 * 获取内容
 * @param param0
 * @returns
 */
async function content({ filePath, chapterPath, ruleId }: any) {
  // 在线
  if (ruleId) {
    const rule = await ruleFileManager.findById(ruleId)
    const rm = new RuleManager(rule)
    const content: string[] = await rm.getContent(chapterPath).catch(() => [])
    let text = ''
    if (rule.contentType === ContentType.MANGA)
      text = content.map(src => `<img src="${src}"/>`).join('')
    else if (rule.contentType === ContentType.VIDEO)
      text = content?.[0] || ''
    else
      text = content.join('')

    return {
      content: text,
    }
  }
  // 本地
  const content = await localBookManager.getContent(toBookChapter(filePath, chapterPath))
  return {
    content,
  }
}

/**
 * 获取章节列表
 * @returns
 */
async function getChapter({ filePath = '', ruleId = undefined } = {}) {
  if (ruleId) {
    const rule = await ruleFileManager.findById(ruleId)
    const rm = new RuleManager(rule)
    const list = await rm.getChapter(filePath).catch(() => [])
    return list.map((e: any) => ({
      ...e,
      name: e.name,
      chapterPath: e.url,
    }),
    )
  }
  // 本地
  return localBookManager.getChapter(filePath)
}

/**
 * 转换为 BookChapter
 * @param filePath 文件路径
 * @param chapterPath 章节路径
 * @returns
 */
function toBookChapter(filePath: string, chapterPath: string): BookChapter {
  return {
    name: '',
    chapterPath,
    filePath,
  }
}

function getRuleExtras() {
  return ruleExtraManager.getRuleExtras()
}

function ping(data: { id: string; host: string }) {
  return ruleExtraManager.ping(data.id, data.host)
}

// 删除规则
async function delRules(data: { id: string[] }) {
  await ruleFileManager.del(data.id, true)
}

function success(data: any, msg = '') {
  return {
    code: 0,
    data,
    msg,
  }
}

export class Api {
  configPath: string
  defaultConfig: any
  config: any

  constructor(params: { configPath: string; defaultConfig?: any }) {
    this.configPath = params.configPath
    this.defaultConfig = params.defaultConfig ?? {}
    this.readConfig()
    return this
  }

  readConfig() {
    ensureFileSync(this.configPath)
    let config = {}
    try {
      config = readJSONSync(this.configPath)
    }
    catch (error) {
      console.warn(error)
    }
    this.config = merge(this.defaultConfig, config)
    if (!this.config.bookDir)
      this.config.bookDir = LOCAL_BOOK_DIR
  }

  async updateConfig(data: any) {
    ensureFileSync(this.configPath)
    this.config = merge(this.config, data || {})
    writeJSONSync(this.configPath, this.config, { spaces: 2 })
  }

  get bookDir(): string {
    return this.config.bookDir
  }

  useApi(register: any) {
    const registerApi = async (apiPath: string, handle: Function, log?: {
      ruleId: (...arg: any) => string
      check: (arg: any) => boolean
    }) => {
      register(apiPath, async (...arg: any) => {
        // 原始返回值
        const result = await handle(...arg).catch(() => {})

        // 记录接口调用情况
        if (typeof log === 'object' && log.ruleId && log.check) {
          const ruleId = log.ruleId(...arg)

          // 不记录没有规则ID的接口
          if (ruleId) {
            const isOk = log.check(result)
            ruleExtraManager.updateApiStatus(ruleId, isOk ? `${apiPath}.ok` : `${apiPath}.fail`)
          }
        }

        // 返回数据
        return success(result)
      })
    }

    const discoverLog = {
      ruleId: (data: any) => data.ruleId,
      check: (v: any[]) => Array.isArray(v) && v.length > 0,
    }

    const contentLog = {
      ruleId: (data: any) => data.ruleId,
      check: (v: any) => v?.content?.length > 0,
    }

    // 注册接口
    registerApi('get@discoverMap', async ({ ruleId = '' } = {}) => await discoverMap(ruleId), discoverLog)
    registerApi('post@discover', async (data: any) => await discover(data), discoverLog)
    registerApi('get@getFavorites', async () => await getFavorites())
    registerApi('post@favorites/remove', async ({ ruleId, url }: { ruleId: string; url: string }) => favoritesManager.del({ url } as any, { id: ruleId } as any))
    registerApi('get@getHistory', async () => await getHistory())
    registerApi('post@history/remove', async ({ ruleId, url }: { ruleId: string; url: string }) => historyManager.del({ url } as any, { id: ruleId } as any))
    registerApi('get@getLocalBooks', async () => await getLocalBooks(this.bookDir))
    registerApi('post@star', async (data: any) => await star(data))
    registerApi('post@unstar', async (data: any) => await unstar(data))
    registerApi('get@rules', async () => await rules())
    registerApi('get@getRuleById', async ({ id = '' } = {}) => await getRuleById(id))
    registerApi('post@createRule', async (data: any) => await createRule(data))
    registerApi('post@updateRule', async (data: any) => await updateRule(data))
    registerApi('post@searchByRuleId', async (data: any) => await searchByRuleId(data), discoverLog)
    registerApi('post@content', async (data: any) => await content(data), contentLog)
    registerApi('post@getChapter', async (data: any) => await getChapter(data), discoverLog)
    // 配置
    registerApi('get@readConfig', async () => this.config)
    registerApi('post@updateConfig', async (data: any) => await this.updateConfig(data))

    registerApi('get@getRuleExtras', async () => await getRuleExtras())
    registerApi('post@ping', async (data: any) => await ping(data))
    registerApi('post@batchUpdateRules', async (data: any) => await batchUpdateRules(data))
    registerApi('post@delRules', async (data: any) => await delRules(data))
    registerApi('post@updateRuleSort', async (data: any) => await ruleFileManager.updateRuleSort(data && data.id))
    registerApi('post@importRules', async (data: any) => await ruleFileManager.importRules(data && data.url))
  }
}
