EventEmitter = (require 'events').EventEmitter
ItemPile = require 'itempile'

module.exports = (game, opts) ->
  return new Harvest(game, opts)

module.exports.pluginInfo =
  loadAfter: ['voxel-mine', 'voxel-registry', 'voxel-carry', 'voxel-inventory-hotbar', 'voxel-console']

class Harvest extends EventEmitter
  constructor: (@game, opts) ->
    @enableToolDamage = opts.enableToolDamage ? true

    @mine = game.plugins?.get('voxel-mine') ? throw new Error('voxel-harvest requires "voxel-mine" plugin')
    @registry = game.plugins?.get('voxel-registry') ? throw new Error('voxel-harvest requires "voxel-registry" plugin')
    @playerInventory = game.plugins?.get('voxel-carry')?.inventory ? opts.playerInventory ? throw new Error('voxel-harvest requires "voxel-carry" plugin or "playerInventory" option set to inventory instance')
    @hotbar = game.plugins?.get('voxel-inventory-hotbar') # optional
    @console = game.plugins?.get('voxel-console') # optional
    @enable()

  enable: () ->
    #@playerInventory.give new ItemPile('pickaxeWood', 5, {damage:5})
    #@playerInventory.give new ItemPile('plankOak', 50)
    #@playerInventory.give new ItemPile('pickaxeStone', 1, {damage:0})
    #@playerInventory.give new ItemPile('chest', 1)

    @mine.on 'break', @onBreak = (target) =>
      #if plugins.isEnabled('debris') # TODO: refactor into module itself (event listener)
      #  debris(target.voxel, target.value)
      #else
      game.setBlock target.voxel, 0

      @damageToolHeld(1)

      # send 'harvest' event, allow preventing (similar to DOM events)
      event =
        target: target
        defaultPrevented: false
        preventDefault: () -> @defaultPrevented = true
      @emit 'harvesting', event
      return if event.defaultPrevented

      blockName = @registry.getBlockName(target.value)
      droppedPile = @block2ItemPile(blockName, @hotbar?.held())
      return if not droppedPile?

      # adds to inventory and refreshes toolbar
      excess = @playerInventory.give droppedPile

      if excess > 0
        # if didn't fit in inventory, un-mine the block since they can't carry it
        # TODO: handle partial fits, prevent dupes (canFit before giving?) -- needed once have custom drops
        @game.setBlock target.voxel, target.value
        # TODO: sfx
        @console.log('You try to mine this block, but are unable to carry it with you (player inventory full)') if @console?
        return

      event =
        target: target
      @emit 'harvested', event


  disable: () ->
    @mine.removeListener 'break', @onBreak

  damageToolHeld: (n=1) ->
    return if not @hotbar?    # no hotbar, no support
    return if not @enableToolDamage

    tool = @hotbar.held()
    return if not tool?       # no tool held

    maxDamage = @registry.getProp tool.item, 'maxDamage'
    return if not maxDamage?  # not an item with finite durability

    tool.tags.damage ?= 0
    tool.tags.damage += 1
    if tool.tags.damage >= maxDamage
      # break tool # TODO: fanfare
      tool = undefined

    @hotbar.inventory.set @hotbar.inventoryWindow.selectedIndex, tool
    @hotbar.refresh()
    #console.log 'tool = ',tool

  block2ItemPile: (blockName, heldTool) ->
    item = @registry.getProp blockName, 'itemDrop'
    if item == null
      # special case, null = no drops
      return undefined
    if item == undefined
      # unspecified, block drops itself
      item = blockName

    heldToolClass = @registry.getProp(heldTool?.item, 'toolClass')
    requiredToolClass = @registry.getProp(blockName, 'requiredTool')
    if requiredToolClass != undefined and heldToolClass != requiredToolClass # TODO: array
      # requires a specific tool, and wrong tool was used
      return undefined

    # TODO: option to drop >1 count of item
    # TODO: option to drop probabilistically, count range min-max, with given chances

    itemPile = new ItemPile(item, 1)

    return itemPile
