# vim: set shiftwidth=2 tabstop=2 softtabstop=2 expandtab:

EventEmitter = (require 'events').EventEmitter
ItemPile = require 'ItemPile'

module.exports = (game, opts) ->
  return new Harvest(game, opts)

module.exports.pluginInfo =
  loadAfter: ['voxel-mine', 'voxel-registry', 'voxel-carry', 'voxel-inventory-hotbar']

class Harvest extends EventEmitter
  constructor: (@game, opts) ->

    @mine = game.plugins?.get('voxel-mine') ? throw 'voxel-harvest requires "voxel-mine" plugin'
    @registry = game.plugins?.get('voxel-registry') ? throw 'voxel-harvest requires "voxel-registry" plugin'
    @playerInventory = game.plugins?.get('voxel-carry')?.inventory ? opts.playerInventory ? throw 'voxel-harvest requires "voxel-carry" plugin or "playerInventory" option set to inventory instance'
    @hotbar = game.plugins?.get('voxel-inventory-hotbar')
    @enable()
  
  enable: () ->
    @playerInventory.give new ItemPile('pickaxeWood', 1, {damage:5})
    #@playerInventory.give new ItemPile('pickaxeStone', 1, {damage:0})

    @mine.on 'break', @onBreak = (target) =>
      #if plugins.isEnabled('debris') # TODO: refactor into module itself (event listener)
      #  debris(target.voxel, target.value)
      #else
      game.setBlock target.voxel, 0

      @damageToolHeld(1)

      # TODO: send 'harvest' event, allow canceling

      blockName = @registry.getBlockName(target.value)
      droppedPile = @block2ItemPile(blockName)
      return if not droppedPile?

      # adds to inventory and refreshes toolbar
      excess = @playerInventory.give droppedPile

      if excess > 0
        # if didn't fit in inventory, un-mine the block since they can't carry it
        # TODO: handle partial fits, prevent dupes (canFit before giving?) -- needed once have custom drops
        @game.setBlock target.voxel, target.value
        # TOOD: some kind of notification

  disable: () ->
    @mine.removeListener 'break', @onBreak

  damageToolHeld: (n=1) ->
    return if not @hotbar?    # no hotbar, no support

    tool = @hotbar.held()
    return if not tool?       # no tool held

    props = @registry.getItemProps(tool.item)
    maxDamage = props.maxDamage
    return if not maxDamage?  # not an item with finite durability

    tool.tags.damage ?= 0 
    tool.tags.damage += 1
    if tool.tags.damage >= maxDamage
      # break tool # TODO: fanfare
      tool = undefined

    @hotbar.inventory.set @hotbar.inventoryWindow.selectedIndex, tool
    @hotbar.refresh()
    console.log 'tool = ',tool

  block2ItemPile: (blockName) ->
    item = @registry.getItemProps(blockName)?.itemDrop
    if item == null  
      # special case, null = no drops
      return undefined
    if item == undefined
      # unspecified, block drops itself
      item = blockName

    # TODO: option to drop >1 count of item
    # TODO: option to drop probabilistically, count range min-max, with given chances

    itemPile = new ItemPile(item, 1)

    return itemPile
