import XEUtils from 'xe-utils'
import GlobalConfig from '../../conf'
import { UtilTools, DomTools, GlobalEvent } from '../../tools'
import { Buttons } from '../../v-x-e-table'

export default {
  name: 'VxeToolbar',
  props: {
    id: String,
    loading: false,
    resizable: { type: [Boolean, Object], default: () => GlobalConfig.toolbar.resizable },
    refresh: { type: [Boolean, Object], default: () => GlobalConfig.toolbar.refresh },
    exps: { type: [Boolean, Object], default: () => GlobalConfig.toolbar.exps },
    setting: { type: [Boolean, Object], default: () => GlobalConfig.toolbar.setting },
    buttons: { type: Array, default: () => GlobalConfig.toolbar.buttons },
    size: String,
    data: Array,
    customs: Array
  },
  inject: {
    $grid: {
      default: null
    }
  },
  data () {
    return {
      $table: null,
      isRefresh: false,
      tableFullColumn: [],
      exportSuffixs: ['csv'],
      exportTypes: [
        {
          value: 'all',
          label: 'vxe.toolbar.exportAll'
        },
        {
          value: 'selected',
          label: 'vxe.toolbar.exportSelected'
        }
      ],
      exportStore: {
        name: '',
        suffix: 'csv',
        type: 'all',
        optHeader: true,
        optIndex: false
      },
      settingStore: {
        visible: false
      }
    }
  },
  computed: {
    vSize () {
      return this.size || this.$parent.size || this.$parent.vSize
    },
    refreshOpts () {
      return Object.assign({}, GlobalConfig.toolbar.refresh, this.refresh)
    },
    expsOpts () {
      return Object.assign({}, GlobalConfig.toolbar.exps, this.exps)
    },
    resizableOpts () {
      return Object.assign({ storageKey: 'VXE_TABLE_CUSTOM_COLUMN_WIDTH' }, GlobalConfig.toolbar.resizable, this.resizable)
    },
    settingOpts () {
      return Object.assign({ storageKey: 'VXE_TABLE_CUSTOM_COLUMN_HIDDEN' }, GlobalConfig.toolbar.setting, this.setting)
    }
  },
  created () {
    let { settingOpts, id, customs } = this
    if (customs) {
      this.tableFullColumn = customs
    }
    if (settingOpts.storage && !id) {
      return UtilTools.error('vxe.error.toolbarId')
    }
    this.$nextTick(() => {
      this.updateConf()
      this.loadStorage()
    })
    GlobalEvent.on(this, 'mousedown', this.handleGlobalMousedownEvent)
    GlobalEvent.on(this, 'blur', this.handleGlobalBlurEvent)
  },
  destroyed () {
    GlobalEvent.off(this, 'mousedown')
    GlobalEvent.off(this, 'blur')
  },
  render (h) {
    let { _e, $scopedSlots, $grid, $table, loading, settingStore, refresh, exps, setting, settingOpts, buttons = [], vSize, tableFullColumn } = this
    let customBtnOns = {}
    let customWrapperOns = {}
    let $buttons = $scopedSlots.buttons
    let $tools = $scopedSlots.tools
    if (setting) {
      if (settingOpts.trigger === 'manual') {
        // 手动触发
      } else if (settingOpts.trigger === 'hover') {
        // hover 触发
        customBtnOns.mouseenter = this.handleMouseenterSettingEvent
        customBtnOns.mouseleave = this.handleMouseleaveSettingEvent
        customWrapperOns.mouseenter = this.handleWrapperMouseenterEvent
        customWrapperOns.mouseleave = this.handleWrapperMouseleaveEvent
      } else {
        // 点击触发
        customBtnOns.click = this.handleClickSettingEvent
      }
    }
    return h('div', {
      class: ['vxe-toolbar', {
        [`size--${vSize}`]: vSize,
        'is--loading': loading
      }]
    }, [
      h('div', {
        class: 'vxe-button--wrapper'
      }, $buttons ? $buttons.call(this, { $grid, $table }, h) : buttons.map(item => {
        return item.visible === false ? _e() : h('vxe-button', {
          on: {
            click: evnt => this.btnEvent(evnt, item)
          },
          props: {
            disabled: item.disabled
          },
          scopedSlots: item.dropdowns && item.dropdowns.length ? {
            default: () => UtilTools.getFuncText(item.name),
            dropdowns: () => item.dropdowns.map(child => {
              return child.visible === false ? _e() : h('vxe-button', {
                on: {
                  click: evnt => this.btnEvent(evnt, child)
                },
                props: {
                  disabled: child.disabled
                }
              }, UtilTools.getFuncText(child.name))
            })
          } : null
        }, UtilTools.getFuncText(item.name))
      })),
      h('div', {
        class: 'vxe-tools--operate'
      }, [
        exps ? h('vxe-button', {
          class: 'vxe-export--btn',
          props: {
            type: 'text',
            icon: GlobalConfig.icon.export
          },
          on: {
            click: this.exportEvent
          }
        }) : null,
        refresh ? h('vxe-button', {
          class: 'vxe-refresh--btn',
          props: {
            type: 'text',
            icon: GlobalConfig.icon.refresh,
            loading: this.isRefresh
          },
          on: {
            click: this.refreshEvent
          }
        }) : null,
        setting ? h('div', {
          class: ['vxe-custom--wrapper', {
            'is--active': settingStore.visible
          }],
          ref: 'customWrapper'
        }, [
          h('div', {
            class: 'vxe-custom--setting-btn',
            on: customBtnOns
          }, [
            h('i', {
              class: GlobalConfig.icon.custom
            })
          ]),
          h('div', {
            class: 'vxe-custom--option-wrapper'
          }, [
            h('div', {
              class: 'vxe-custom--option',
              on: customWrapperOns
            }, tableFullColumn.map(column => {
              let { property, visible, own } = column
              let headerTitle = UtilTools.getFuncText(own.title || own.label)
              return property && headerTitle ? h('vxe-checkbox', {
                props: {
                  value: visible
                },
                attrs: {
                  title: headerTitle
                },
                on: {
                  change: value => {
                    column.visible = value
                    if (setting && settingOpts.immediate) {
                      this.updateSetting()
                    }
                  }
                }
              }, headerTitle) : null
            }))
          ])
        ]) : null
      ]),
      $tools ? h('div', {
        class: 'vxe-tools--wrapper'
      }, $tools.call(this, { $grid, $table }, h)) : null
    ])
  },
  methods: {
    updateConf () {
      let { $parent, data } = this
      let { $children } = $parent
      let selfIndex = $children.indexOf(this)
      this.$table = $children.find((comp, index) => comp && comp.refreshColumn && index > selfIndex && (data ? comp.data === data : comp.$vnode.componentOptions.tag === 'vxe-table'))
    },
    openSetting () {
      this.settingStore.visible = true
    },
    closeSetting () {
      let { setting, settingStore } = this
      if (settingStore.visible) {
        settingStore.visible = false
        if (setting && !settingStore.immediate) {
          this.updateSetting()
        }
      }
    },
    loadStorage () {
      let { $grid, $table, id, refresh, resizable, setting, refreshOpts, resizableOpts, settingOpts } = this
      if (refresh && !$grid) {
        if (!refreshOpts.query) {
          UtilTools.warn('vxe.error.notFunc', ['query'])
        }
      }
      if (resizable || setting) {
        if ($grid || $table) {
          ($grid || $table).connect({ toolbar: this })
        } else {
          throw new Error(UtilTools.getLog('vxe.error.barUnableLink'))
        }
        let customMap = {}
        if (resizableOpts.storage) {
          let columnWidthStorage = this.getStorageMap(resizableOpts.storageKey)[id]
          if (columnWidthStorage) {
            XEUtils.each(columnWidthStorage, (resizeWidth, field) => {
              customMap[field] = { field, resizeWidth }
            })
          }
        }
        if (settingOpts.storage) {
          let columnHideStorage = this.getStorageMap(settingOpts.storageKey)[id]
          if (columnHideStorage) {
            columnHideStorage.split(',').forEach(field => {
              if (customMap[field]) {
                customMap[field].visible = false
              } else {
                customMap[field] = { field, visible: false }
              }
            })
          }
        }
        let customList = Object.values(customMap)
        this.updateCustoms(customList.length ? customList : this.tableFullColumn)
      }
    },
    updateColumn (fullColumn) {
      this.tableFullColumn = fullColumn
    },
    updateCustoms (customs) {
      let { $grid, $table } = this
      let comp = $grid || $table
      if (comp) {
        comp.reloadCustoms(customs).then(fullColumn => {
          this.tableFullColumn = fullColumn
        })
      }
    },
    getStorageMap (key) {
      let version = GlobalConfig.version
      let rest = XEUtils.toStringJSON(localStorage.getItem(key))
      return rest && rest._v === version ? rest : { _v: version }
    },
    saveColumnHide () {
      let { id, tableFullColumn, settingOpts } = this
      if (settingOpts.storage) {
        let columnHideStorageMap = this.getStorageMap(settingOpts.storageKey)
        let colHides = tableFullColumn.filter(column => column.property && !column.visible)
        columnHideStorageMap[id] = colHides.length ? colHides.map(column => column.property).join(',') : undefined
        localStorage.setItem(settingOpts.storageKey, XEUtils.toJSONString(columnHideStorageMap))
      }
      return this.$nextTick()
    },
    saveColumnWidth (isReset) {
      let { id, tableFullColumn, resizableOpts } = this
      if (resizableOpts.storage) {
        let columnWidthStorageMap = this.getStorageMap(resizableOpts.storageKey)
        let columnWidthStorage
        if (!isReset) {
          columnWidthStorage = XEUtils.isPlainObject(columnWidthStorageMap[id]) ? columnWidthStorageMap[id] : {}
          tableFullColumn.forEach(({ property, resizeWidth, renderWidth }) => {
            if (property && resizeWidth) {
              columnWidthStorage[property] = renderWidth
            }
          })
        }
        columnWidthStorageMap[id] = XEUtils.isEmpty(columnWidthStorage) ? undefined : columnWidthStorage
        localStorage.setItem(resizableOpts.storageKey, XEUtils.toJSONString(columnWidthStorageMap))
      }
      return this.$nextTick()
    },
    hideColumn (column) {
      UtilTools.warn('vxe.error.delFunc', ['hideColumn', 'table.hideColumn'])
      column.visible = false
      return this.updateSetting()
    },
    showColumn (column) {
      UtilTools.warn('vxe.error.delFunc', ['showColumn', 'table.showColumn'])
      column.visible = true
      return this.updateSetting()
    },
    resetCustoms () {
      return this.updateSetting()
    },
    resetResizable () {
      this.updateResizable(this)
    },
    updateResizable (isReset) {
      let { $grid, $table } = this
      let comp = $grid || $table
      this.saveColumnWidth(isReset)
      comp.analyColumnWidth()
      return comp.recalculate(true)
    },
    updateSetting () {
      (this.$grid || this.$table).refreshColumn()
      return this.saveColumnHide()
    },
    handleGlobalMousedownEvent (evnt) {
      if (!DomTools.getEventTargetNode(evnt, this.$refs.customWrapper).flag) {
        this.closeSetting()
      }
    },
    handleGlobalBlurEvent (evnt) {
      this.closeSetting()
    },
    handleClickSettingEvent (evnt) {
      let { settingStore } = this
      settingStore.visible = !settingStore.visible
    },
    handleMouseenterSettingEvent (evnt) {
      this.settingStore.activeBtn = true
      this.openSetting()
    },
    handleMouseleaveSettingEvent (evnt) {
      let { settingStore } = this
      settingStore.activeBtn = false
      setTimeout(() => {
        if (!settingStore.activeBtn && !settingStore.activeWrapper) {
          this.closeSetting()
        }
      }, 300)
    },
    handleWrapperMouseenterEvent (evnt) {
      this.settingStore.activeWrapper = true
      this.openSetting()
    },
    handleWrapperMouseleaveEvent (evnt) {
      let { settingStore } = this
      settingStore.activeWrapper = false
      setTimeout(() => {
        if (!settingStore.activeBtn && !settingStore.activeWrapper) {
          this.closeSetting()
        }
      }, 300)
    },
    refreshEvent () {
      let { $grid, refreshOpts, isRefresh } = this
      if (!isRefresh) {
        if (refreshOpts.query) {
          this.isRefresh = true
          refreshOpts.query().catch(e => e).then(() => {
            this.isRefresh = false
          })
        } else if ($grid) {
          this.isRefresh = true
          $grid.commitProxy('reload').catch(e => e).then(() => {
            this.isRefresh = false
          })
        }
      }
    },
    btnEvent (evnt, item) {
      let { $grid, $table } = this
      let { code } = item
      if (code) {
        if ($grid) {
          $grid.triggerToolbarBtnEvent(item, evnt)
        } else {
          let btnMethod = Buttons.get(code)
          let params = { code, button: item, $grid, $table }
          if (btnMethod) {
            btnMethod.call(this, params, evnt)
          }
          UtilTools.emitEvent(this, 'button-click', [params, evnt])
        }
      }
    },
    exportEvent () {
      const { $grid, $table, vSize, exportStore, exportSuffixs, exportTypes } = this
      const comp = $grid || $table
      const selectRecords = comp.getSelectRecords()
      Object.assign(exportStore, {
        name: '',
        type: selectRecords.length ? 'selected' : 'all',
        optHeader: true,
        optIndex: false
      })
      this.$XModal({
        title: GlobalConfig.i18n('vxe.toolbar.exportTitle'),
        width: 520,
        mask: true,
        lockView: true,
        showFooter: false,
        maskClosable: true,
        size: vSize,
        slots: {
          default (params, h) {
            const $modal = params.$modal
            return [
              h('div', {
                class: 'vxe-export--panel'
              }, [
                h('table', [
                  h('tr', [
                    h('td', GlobalConfig.i18n('vxe.toolbar.exportName')),
                    h('td', [
                      h('input', {
                        attrs: {
                          type: 'text',
                          placeholder: GlobalConfig.i18n('vxe.toolbar.exportNamePlaceholder')
                        },
                        domProps: {
                          value: exportStore.name
                        },
                        on: {
                          input (evnt) {
                            exportStore.name = evnt.target.value
                          }
                        }
                      })
                    ])
                  ]),
                  h('tr', [
                    h('td', GlobalConfig.i18n('vxe.toolbar.exportType')),
                    h('td', [
                      h('select', {
                        on: {
                          change (evnt) {
                            exportStore.type = evnt.target.value
                          }
                        }
                      }, exportTypes.map(item => {
                        return h('option', {
                          attrs: {
                            value: item.value
                          },
                          domProps: {
                            selected: exportStore.type === item.value
                          }
                        }, GlobalConfig.i18n(item.label))
                      }))
                    ])
                  ]),
                  h('tr', [
                    h('td', GlobalConfig.i18n('vxe.toolbar.exportSuffix')),
                    h('td', [
                      h('select', {
                        on: {
                          change (evnt) {
                            exportStore.type = evnt.target.value
                          }
                        }
                      }, exportSuffixs.map(suffix => {
                        return h('option', {
                          attrs: {
                            value: suffix
                          },
                          domProps: {
                            selected: exportStore.suffix === suffix
                          }
                        }, suffix)
                      }))
                    ])
                  ]),
                  h('tr', [
                    h('td', GlobalConfig.i18n('vxe.toolbar.exportOpts')),
                    h('td', [
                      h('vxe-checkbox', {
                        model: {
                          value: exportStore.optHeader,
                          callback (value) {
                            exportStore.optHeader = value
                          }
                        }
                      }, GlobalConfig.i18n('vxe.toolbar.exportOptHeader')),
                      h('vxe-checkbox', {
                        model: {
                          value: exportStore.optIndex,
                          callback (value) {
                            exportStore.optIndex = value
                          }
                        }
                      }, GlobalConfig.i18n('vxe.toolbar.exportOptIndex'))
                    ])
                  ])
                ]),
                h('div', {
                  class: 'vxe-export--panel-btns'
                }, [
                  h('vxe-button', {
                    props: {
                      type: 'primary',
                      size: vSize
                    },
                    on: {
                      click () {
                        const options = {
                          filename: exportStore.name || GlobalConfig.i18n('vxe.toolbar.exportTitle'),
                          isHeader: exportStore.optHeader
                        }
                        if (exportStore.optIndex) {
                          // 在 v3.0 中废弃 type=selection
                          options.columnFilterMethod = column => column.type === 'index' || (column.property && ['checkbox', 'selection', 'radio'].indexOf(column.type) === -1)
                        }
                        comp.exportCsv(options)
                        $modal.close()
                      }
                    }
                  }, GlobalConfig.i18n('vxe.toolbar.exportConfirm'))
                ])
              ])
            ]
          }
        }
      })
    }
  }
}
