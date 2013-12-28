# vim: set shiftwidth=2 tabstop=2 softtabstop=2 expandtab:

EventEmitter = (require 'events').EventEmitter
ItemPile = require 'ItemPile'

module.exports = (game, opts) ->
  return new Harvest(game, opts)

module.exports.pluginInfo =
  loadAfter: ['voxel-mine', 'voxel-registry', 'voxel-carry']

class Harvest extends EventEmitter
  constructor: (@game, opts) ->

    @mine = game.plugins?.get('voxel-mine') ? throw 'voxel-harvest requires "voxel-mine" plugin'
    @registry = game.plugins?.get('voxel-registry') ? throw 'voxel-harvest requires "voxel-mine" plugin'
    @playerInventory = game.plugins?.get('voxel-carry')?.inventory ? opts.playerInventory ? throw 'voxel-harvest requires "voxel-carry" plugin or "playerInventory" option set to inventory instance'
    @block2ItemPile = opts.block2ItemPile ? (blockName) -> new ItemPile(blockName, 1)
    @enable()
  
  enable: () ->
    @mine.on 'break', @onBreak = (target) =>
      #if plugins.isEnabled('debris') # TODO: refactor into module itself (event listener)
      #  debris(target.voxel, target.value)
      #else
      game.setBlock target.voxel, 0

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

