
import { api } from './utils/api'
import { player } from './utils/player'
import { video } from './utils/video'
import { Download } from './utils/download'
import { scroll } from './ui/scroll'
import { initMessage, Message, MessageBox } from './ui/message'
import { config } from './config'
import { user } from './user'
import { auth } from './auth'
import { check } from './check'
import { store } from './store'
import arc_toolbar_html from '../html/arc_toolbar.html'
import video_toolbar_html from '../html/video_toolbar.html'
import toolbar_html from '../html/toolbar.html'

import { createApp } from 'vue'
import configVue from '../template/config.vue'

class Main {
    constructor() {
        this.has_toolbar = false
        setTimeout(() => {
            this.run_before()
        }, 1000)
    }

    run_before() {
        this.has_toolbar = this.set_toolbar()
        if (this.has_toolbar) {
            this.run()
        }
    }

    set_toolbar() {
        if (this.has_toolbar) return
        let bp_toolbar
        if (!!$('#arc_toolbar_report')[0]) {
            bp_toolbar = arc_toolbar_html
            $('#arc_toolbar_report').after(bp_toolbar)
        } else if (!!$('#toolbar_module')[0]) {
            bp_toolbar = toolbar_html
            $('#toolbar_module').after(bp_toolbar)
        } else if (!!$('div.video-toolbar')[0]) {
            bp_toolbar = video_toolbar_html
            $('div.video-toolbar').after(bp_toolbar)
        }
        this.has_toolbar = !!bp_toolbar
    }

    run() {

        const root_div = document.createElement('div')
        root_div.id = 'bp_root'
        document.body.append(root_div)
        const root = document.getElementById(root_div.id)

        let app, div
        // initConfig
        div = document.createElement('div')
        div.id = 'root_config'
        root.append(div)
        app = createApp(configVue)
        app.mount(`#${div.id}`)

        initMessage()

        user.lazyInit()
        auth.initAuth()
        auth.checkLoginStatus()
        check.refresh()

        $(`#${root_div.id}`).append('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dplayer@1.25.0/dist/DPlayer.min.css"></script>') // for dom changed

        $(`#${root_div.id}`).append('<a id="video_url" style="display:none;" target="_blank" referrerpolicy="origin" href="#"></a>')
        $(`#${root_div.id}`).append('<a id="video_url_2" style="display:none;" target="_blank" referrerpolicy="origin" href="#"></a>')

        $('body').on('click', '#setting_btn', () => {
            user.lazyInit(true) // init
            // set form by config
            for (const key in config) {
                $(`#${key}`).val(config[key])
            }
            //show setting
            $("#bp_config").show()
            $("#bp_config").animate({
                'opacity': '1'
            }, 300)
            scroll.hide()
        })

        $('body').on('click', '#download_danmaku', () => {
            const vb = video.base()
            Download.download_danmaku_ass(vb.cid(), vb.filename())
        })

        $('body').on('click', '#download_subtitle', () => {
            Download.download_subtitle_vtt(0, video.base().filename())
        })

        $('body').on('click', '#video_download_all', () => {
            user.lazyInit(true) // init

            if (store.get('auth_id') && store.get('auth_sec')) {
                if (config.download_type === 'rpc') {
                    Download.download_all()
                } else {
                    MessageBox.confirm('仅支持使用RPC接口批量下载，请确保RPC环境正常，是否继续？', () => {
                        Download.download_all()
                    })
                }
            } else {
                MessageBox.confirm('批量下载仅支持授权用户使用RPC接口下载，是否进行授权？', () => {
                    auth.login()
                })
            }
        })

        $('body').on('click', '#video_download', () => {
            const type = config.download_type
            if (type === 'web') {
                $('#video_url')[0].click()
            } else if (type === 'a') {
                const [video_url, video_url_2] = [
                    $('#video_url').attr('href'),
                    $('#video_url_2').attr('href')
                ]
                const msg = '建议使用IDM、FDM等软件安装其浏览器插件后，鼠标右键点击链接下载~<br/><br/>' +
                    `<a href="${video_url}" target="_blank" style="text-decoration:underline;">&gt视频地址&lt</a><br/><br/>` +
                    (config.format === 'dash' ? `<a href="${video_url_2}" target="_blank" style="text-decoration:underline;">&gt音频地址&lt</a>` : '')
                MessageBox.alert(msg)
            } else if (type === 'aria') {
                const [video_url, video_url_2] = [
                    $('#video_url').attr('href'),
                    $('#video_url_2').attr('href')
                ]
                const video_title = video.base().filename()
                let file_name, file_name_2
                file_name = video_title + Download.url_format(video_url)
                file_name_2 = video_title + '_audio.mp4'
                const aria2_header = `--header "User-Agent: ${window.navigator.userAgent}" --header "Referer: ${window.location.href}"`
                const [code, code_2] = [
                    `aria2c "${video_url}" --out "${file_name}" ${aria2_header}`,
                    `aria2c "${video_url_2}" --out "${file_name_2}" ${aria2_header}`
                ]
                const msg = '点击文本框即可复制下载命令！<br/><br/>' +
                    `视频：<br/><input id="aria2_code" value='${code}' onclick="bp_clip_btn('aria2_code')" style="width:100%;"></br></br>` +
                    (config.format === 'dash' ? `音频：<br/><input id="aria2_code_2" value='${code_2}' onclick="bp_clip_btn('aria2_code_2')" style="width:100%;"><br/><br/>` +
                        `全部：<br/><textarea id="aria2_code_all" onclick="bp_clip_btn('aria2_code_all')" style="min-width:100%;max-width:100%;min-height:100px;max-height:100px;">${code}\n${code_2}</textarea>` : '')
                !window.bp_clip_btn && (window.bp_clip_btn = (id) => {
                    $(`#${id}`).select()
                    if (document.execCommand('copy')) {
                        Message.success('复制成功')
                    } else {
                        Message.warning('复制失败')
                    }
                })
                MessageBox.alert(msg)
            } else {
                const url = $('#video_url').attr('href')
                const filename = video.base().filename()
                Download.download(url, filename, type)
            }
        })

        $('body').on('click', '#video_download_2', () => {
            const type = config.download_type
            if (type === 'web') {
                $('#video_url_2')[0].click()
            } else if (type === 'a') {
                $('#video_download').click()
            } else if (type === 'aria') {
                $('#video_download').click()
            } else {
                const url = $('#video_url_2').attr('href')
                const filename = video.base().filename()
                Download.download(url, filename, type)
            }
        })

        let api_url, api_url_temp
        $('body').on('click', '#bilibili_parse', () => {
            user.lazyInit(true) // init
            const vb = video.base()
            const [type, aid, p, cid, epid] = [
                vb.type,
                vb.aid(),
                vb.p(),
                vb.cid(),
                vb.epid()
            ]
            const { q } = video.get_quality()
            api_url = `${config.base_api}?av=${aid}&p=${p}&cid=${cid}&ep=${epid}&q=${q}&type=${type}&format=${config.format}&otype=json&_host=${config.host_key}&_req=${config.request_type}`
            const [auth_id, auth_sec] = [
                store.get('auth_id'),
                store.get('auth_sec')
            ]
            if (config.auth === '1' && auth_id && auth_sec) {
                api_url += `&auth_id=${auth_id}&auth_sec=${auth_sec}`
            }
            if (api_url === api_url_temp && config.request_type !== 'local') {
                Message.miaow()
                const url = $('#video_url').attr('href')
                const url_2 = $('#video_url_2').attr('href')
                if (url && url !== '#') {
                    $('#video_download').show()
                    config.format === 'dash' && $('#video_download_2').show()
                    if (user.needReplace() || vb.is_limited() || config.replace_force === '1') {
                        !$('#bp_dplayer')[0] && player.replace_player(url, url_2)
                    }
                    if (config.auto_download === '1') {
                        $('#video_download').click()
                    }
                }
                return
            }
            $('#video_url').attr('href', '#')
            $('#video_url_2').attr('href', '#')
            api_url_temp = api_url

            Message.info('开始请求')
            api.get_url(res => {
                if (res && !res.code) {
                    res.times && Message.info(`剩余请求次数：${res.times}`)
                    let url = config.format === 'dash' ? res.video.replace('http://', 'https://') : res.url.replace('http://', 'https://')
                    let url_2 = config.format === 'dash' ? res.audio.replace('http://', 'https://') : '#'
                    $('#video_url').attr('href', url)
                    $('#video_download').show()
                    if (config.format === 'dash') {
                        $('#video_url_2').attr('href', url_2)
                        $('#video_download_2').show()
                    }
                    if (user.needReplace() || vb.is_limited() || config.replace_force === '1') {
                        player.replace_player(url, url_2)
                    }
                    if (config.auto_download === '1') {
                        $('#video_download').click()
                    }
                }
            })
        })

        // part of check
        $('body').on('click', 'a.router-link-active', function () {
            if (this !== $('li[class="on"]').find('a')[0]) {
                check.refresh()
            }
        })
        $('body').on('click', 'li.ep-item', () => {
            check.refresh()
        })
        $('body').on('click', 'button.bilibili-player-iconfont-next', () => {
            check.refresh()
        })
        const bili_video_tag = player.bili_video_tag()
        !!$(bili_video_tag)[0] && ($(bili_video_tag)[0].onended = () => {
            check.refresh()
        })
        // 监听q
        $('body').on('click', 'li.bui-select-item', () => {
            check.refresh()
        })
        setInterval(() => {
            if (check.q !== video.get_quality().q) {
                check.refresh()
            } else if (video.type() === 'cheese') {
                // epid for cheese
                if (check.epid !== video.base().epid()) {
                    check.refresh()
                }
            }
        }, 1000)
        // 监听aid
        $('body').on('click', '.rec-list', () => {
            check.refresh()
        })
        $('body').on('click', '.bilibili-player-ending-panel-box-videos', () => {
            check.refresh()
        })
        // 定时检查 aid 和 cid
        setInterval(() => {
            const vb = video.base()
            if (check.aid !== vb.aid() || check.cid !== vb.cid()) {
                check.refresh()
            }
        }, 3000)
    }
}

export default Main
