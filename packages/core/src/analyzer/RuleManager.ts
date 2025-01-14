import { JSEngine } from './JSEngine'
import { AnalyzerManager } from './AnalyzerManager'
import { fetch } from './AnalyzerUrl'

export enum ContentType {
  MANGA = 0,
  NOVEL = 1,
  VIDEO = 2,
  AUDIO = 3,
  RSS = 4,
  NOVELMORE = 5,

  GAME = 101,
}

export const CONTENT_TYPE_TEXT: {
  [k: number]: string
} = {
  0: '漫画',
  1: '小说',
  2: '视频',
  3: '音频',
  4: 'RSS',
  5: '图文',
  101: '游戏',
}

export interface Rule {
  host: string // 域名
  id: string // uuid
  name: string // 书源名称
  sort: number // 书源排序
  contentType: ContentType // 书源类型
  cookies?: string
  loadJs: string // 全局JS脚本

  // 搜索
  enableSearch?: boolean // 搜索 - 启用
  searchUrl: string // 搜索 - 地址
  searchList: string // 搜索 - 列表
  searchCover: string // 搜索 - 封面
  searchName: string // 搜索 - 标题
  searchAuthor: string // 搜索 - 作者
  searchChapter: string // 搜索 - 章节
  searchDescription: string // 搜索 - 描述
  searchResult: string // 搜索 - 结果

  // 章节列表
  chapterUrl: string // 章节列表 - 请求地址
  chapterName: string // 章节列表 - 标题
  chapterList: string // 章节列表 - 列表
  chapterCover: string // 章节列表 - 封面
  chapterTime: string // 章节列表 - 时间
  chapterResult: string // 章节列表 - 结果

  contentItems: string // 章节列表 - 内容

  // 发现
  enableDiscover: boolean // 发现页 - 是否启用
  discoverUrl: string // 发现页 - 请求地址
  discoverList: string // 发现页 - 列表
  discoverName: string // 发现页 - 标题
  discoverCover: string // 发现页 - 封面
  discoverAuthor: string // 发现页 - 作者
  discoverDescription: string // 发现页 - 描述
  discoverResult: string // 发现页 - 结果
  discoverItems: string
  discoverTags: string
  discoverChapter: string
  discoverNextUrl?: string

  // 线路
  enableMultiRoads: boolean // 启用多线路
  chapterRoads: string // 线路列表
}

export interface SearchItem {
  cover: string
  name: string
  author: string
  chapter: string
  description: string
  url: string
}

export interface ChapterItem {
  url: string
  name: string
  contentUrl?: string
  cover?: string
  time?: string
}

export class RuleManager {
  rule: Rule
  _nextUrl: Map<string, string>

  constructor(rule: Rule) {
    this.rule = rule
    this._nextUrl = new Map()
  }

  async search(keyword: string) {
    const { body } = await fetch(this.rule.searchUrl, keyword, '', this.rule)
    const bodyAnalyzer = new AnalyzerManager(body)
    const list = await bodyAnalyzer.getElements(this.rule.searchList)

    const result: SearchItem[] = []
    for (const row of list) {
      const analyzer = new AnalyzerManager(row)

      result.push({
        cover: await analyzer.getString(this.rule.searchCover),
        name: (await analyzer.getString(this.rule.searchName)).trim(),
        author: await analyzer.getString(this.rule.searchAuthor),
        chapter: await analyzer.getString(this.rule.searchChapter),
        description: await analyzer.getString(this.rule.searchDescription),
        url: await analyzer.getUrl(this.rule.searchResult, this.rule.host),
      })
    }

    return result
  }

  async getChapter(result: string): Promise<ChapterItem[]> {
    if (this.rule.chapterUrl === '正文') {
      return [
        {
          url: result,
          name: this.rule.chapterUrl,
        },
      ]
    }
    const chapterUrl = this.rule.chapterUrl || result
    const { body } = await fetch(chapterUrl, '', result, this.rule)

    JSEngine.setEnvironment({
      page: 1,
      rule: this.rule,
      result: '',
      baseUrl: chapterUrl,
      keyword: '',
      lastResult: result,
    })
    const bodyAnalyzer = new AnalyzerManager(body)

    let list = []
    if (this.rule.enableMultiRoads) {
      // TODO: 多线路
      const roads = await bodyAnalyzer.getElements(this.rule.chapterRoads)
      // for (const road of roads) {
      const road = roads[0]
      const roadAnalyzer = new AnalyzerManager(road)
      list = await roadAnalyzer.getElements(this.rule.chapterList)
      // }
    }
    else {
      list = await bodyAnalyzer.getElements(this.rule.chapterList)
    }
    const chapterItems: ChapterItem[] = []
    for (const row of list) {
      const analyzer = new AnalyzerManager(row)
      chapterItems.push({
        cover: await analyzer.getString(this.rule.chapterCover),
        name: (await analyzer.getString(this.rule.chapterName)).trim(),
        time: await analyzer.getString(this.rule.chapterTime),
        url: await analyzer.getUrl(this.rule.chapterResult, this.rule.host),
      })
    }
    return chapterItems
  }

  async getContent(result: string, lastResult?: string): Promise<string[]> {
    if (lastResult) {
      JSEngine.setEnvironment({
        page: 1,
        rule: this.rule,
        result: lastResult,
        baseUrl: '',
        keyword: '',
        lastResult,
      })
    }
    const { body, params } = await fetch(result, '', '', this.rule)
    JSEngine.setEnvironment({
      page: 1,
      rule: this.rule,
      result: '',
      baseUrl: params.url,
      keyword: '',
      lastResult: result,
    })
    const bodyAnalyzer = new AnalyzerManager(body)
    const list = await bodyAnalyzer.getStringList(this.rule.contentItems)
    return list
  }

  // 获取获取分类
  async discoverMap() {
    const map = []
    const table = new Map()

    let discoverUrl = this.rule.discoverUrl.trimStart()

    try {
      if (discoverUrl.startsWith('@js:')) {
        JSEngine.setEnvironment({
          page: 1,
          rule: this.rule,
          result: '',
          baseUrl: this.rule.host,
          keyword: '',
          lastResult: '',
        })
        discoverUrl = await JSEngine.evaluate(
          `${discoverUrl.substring(4)};`,
        ).catch((e) => {
          console.warn('[JSEngine.evaluate]', e)
          return ''
        })
      }

      const discovers = Array.isArray(discoverUrl)
        ? discoverUrl.map(e => e.toString())
        : typeof discoverUrl === 'string'
          ? discoverUrl.split(/[\n\s*]|&&/)
          : []

      for (const url of discovers) {
        if (url.trim().length === 0)
          continue

        const d = url.split('::')
        const ruleValue = d[d.length - 1].trim()
        let tab = '全部'
        let className = '全部'

        if (d.length === 2) {
          tab = d[0].trim()
          className = '全部'
        }
        else if (d.length === 3) {
          tab = d[0].trim()
          className = d[1].trim()
        }

        if (!table.has(tab)) {
          table.set(tab, map.length)
          map.push(
            new DiscoverMap(tab, [new DiscoverPair(className, ruleValue)]),
          )
        }
        else {
          map[table.get(tab)].pairs.push(
            new DiscoverPair(className, ruleValue),
          )
        }
      }
    }
    catch (error) {}

    if (map.length === 0) {
      if (this.rule.host.startsWith('http')) {
        map.push(
          new DiscoverMap('全部', [new DiscoverPair('全部', this.rule.host)]),
        )
      }
      else {
        map.push(
          new DiscoverMap('example', [
            new DiscoverPair('example', 'http://example.com/'),
          ]),
        )
      }
    }

    return map
  }

  // 获取分类下内容
  async discover(url: string, page = 1) {
    const hasNextUrlRule
      = this.rule.discoverNextUrl !== undefined
      && this.rule.discoverNextUrl.length > 0
    let discoverRule

    if (page === 1) {
      discoverRule = url
    }
    else if (hasNextUrlRule && page > 1) {
      const next = this._nextUrl.get(url)
      if (next !== undefined && next.length > 0)
        discoverRule = next
    }
    else if (
      /(\$page)|((^|[^a-zA-Z'"_/-])page([^a-zA-Z0-9'"]|$))/.test(url)
    ) {
      discoverRule = url
    }

    if (!discoverRule)
      return []

    const discoverUrl = ''
    let body = ''

    if (discoverRule !== 'null') {
      const { body: res } = await fetch(discoverRule, '', '', this.rule)
      body = res
    }

    JSEngine.setEnvironment({
      page,
      rule: this.rule,
      result: discoverUrl,
      baseUrl: this.rule.host,
      keyword: '',
      lastResult: '',
    })

    const bodyAnalyzer = new AnalyzerManager(body)
    if (hasNextUrlRule) {
      this._nextUrl.set(
        url,
        await bodyAnalyzer.getString(this.rule.discoverNextUrl as string),
      )
    }
    else { this._nextUrl.delete(url) }

    const list = await bodyAnalyzer.getElements(this.rule.discoverList)
    const result = []

    for (const item of list) {
      const analyzer = new AnalyzerManager(item)
      const tag = await analyzer.getString(this.rule.discoverTags)

      let tags: string[] = []
      if (tag !== undefined && tag.trim() !== '')
        tags = tag.split(' ').filter(tag => tag !== '')

      result.push({
        searchUrl: discoverUrl,
        cover: await analyzer.getString(this.rule.discoverCover),
        name: await analyzer.getString(this.rule.discoverName),
        author: await analyzer.getString(this.rule.discoverAuthor),
        chapter: await analyzer.getString(this.rule.discoverChapter),
        description: await analyzer.getString(this.rule.discoverDescription),
        url: await analyzer.getString(this.rule.discoverResult),
        tags,
      })
    }

    return result
  }
}

class DiscoverMap {
  name: string
  pairs: DiscoverPair[]

  constructor(name: string, pairs: DiscoverPair[]) {
    this.name = name
    this.pairs = pairs
  }
}

class DiscoverPair {
  name: string
  value: string

  constructor(name: string, value: string) {
    this.name = name
    this.value = value
  }
}
