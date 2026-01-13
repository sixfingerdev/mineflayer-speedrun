const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals: { GoalXZ, GoalGetToBlock, GoalNear, GoalBlock, GoalCompositeAny } } = require('mineflayer-pathfinder')
const { Vec3 } = require('vec3')

// Bot configuration
const BOT_CONFIG = {
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME || 'SpeedrunBot',
    version: process.env.MC_VERSION || false // Auto-detect version
}

console.log('=== Minecraft Speedrun Bot ===')
console.log('Configuration:', BOT_CONFIG)

// Create bot instance
const bot = mineflayer.createBot(BOT_CONFIG)

// Bot state management
const state = {
    current: 'initializing',
    previous: 'initializing',
    doing: false,
    
    // Village phase
    atVillage: false,
    villageSearching: false,
    villageSearchAttempts: 0,
    
    // Tools and resources
    wooden_pick: false,
    three_wood: false,
    three_stone: false,
    stone_pick: false,
    six_stone: false,
    stone_axe: false,
    
    // Village resources
    beds: 0,
    chests: false,
    hays: 0,
    
    // Iron phase
    dirt: 0,
    iron: 0,
    golem: false,
    iron_golem_target: null,
    
    // Crafting
    bread: false,
    bucket: false,
    
    // Gravel and flint
    gravel: false,
    flint: false,
    placeGravelHere: null,
    
    // Water
    water: false,
    waterBlock: null,
    
    // Flags
    goingToCraft: false,
    goingToGolem: false,
    goingToIron: false,
    goingToFlint: false,
    gettingWater: false,
    
    // Portal phase
    portalBuilt: false,
    inNether: false,
    
    // Nether phase
    blazeRods: 0,
    netherFortressFound: false,
    blazePowder: 0,
    
    // Ender pearl phase
    enderPearls: 0,
    eyesOfEnder: 0,
    
    // Stronghold phase
    strongholdFound: false,
    strongholdLocation: null,
    inStronghold: false,
    portalRoomFound: false,
    
    // End phase
    inEnd: false,
    crystalsDestroyed: 0,
    dragonDefeated: false
}

let mcData = null

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [${level}] [${state.current}] ${message}`)
}

function distance(point1, point2) {
    const temp = Math.pow((point2.x - point1.x), 2) + 
                 Math.pow((point2.y - point1.y), 2) + 
                 Math.pow((point2.z - point1.z), 2)
    return Math.sqrt(temp)
}

function hasItem(name) {
    return bot.inventory.items().filter(item => item.name === name)[0]
}

function itemToString(item) {
    if (item) {
        return `${item.name} x ${item.count}`
    } else {
        return '(nothing)'
    }
}

function sayItems(items = bot.inventory.items()) {
    const output = items.map(itemToString).join(', ')
    if (output) {
        log(`Inventory: ${output}`)
    } else {
        log('Inventory: empty')
    }
}

function equipItem(name, destination) {
    const item = hasItem(name)
    if (item) {
        try {
            bot.equip(item, destination)
            log(`Equipped ${name}`)
        } catch (err) {
            log(`Cannot equip ${name}: ${err.message}`, 'ERROR')
        }
    } else {
        log(`No ${name} in inventory`, 'WARN')
    }
}

function tossItem(name, amount) {
    const item = hasItem(name)
    if (!item) {
        log(`Cannot toss ${name} - not in inventory`, 'WARN')
    } else if (amount) {
        bot.toss(item.type, null, amount)
        log(`Tossed ${name} x ${amount}`)
    } else {
        bot.tossStack(item)
        log(`Tossed all ${name}`)
    }
}

function woodArray() {
    return [
        mcData.blocksByName["oak_log"].id,
        mcData.blocksByName["spruce_log"].id,
        mcData.blocksByName["birch_log"].id,
        mcData.blocksByName["acacia_log"].id,
        mcData.blocksByName["dark_oak_log"].id
    ]
}

function bedArray() {
    return [
        mcData.blocksByName["white_bed"].id,
        mcData.blocksByName["orange_bed"].id,
        mcData.blocksByName["magenta_bed"].id,
        mcData.blocksByName["light_blue_bed"].id,
        mcData.blocksByName["yellow_bed"].id,
        mcData.blocksByName["lime_bed"].id,
        mcData.blocksByName["pink_bed"].id,
        mcData.blocksByName["gray_bed"].id,
        mcData.blocksByName["light_gray_bed"].id,
        mcData.blocksByName["cyan_bed"].id,
        mcData.blocksByName["purple_bed"].id,
        mcData.blocksByName["blue_bed"].id,
        mcData.blocksByName["brown_bed"].id,
        mcData.blocksByName["green_bed"].id,
        mcData.blocksByName["red_bed"].id,
        mcData.blocksByName["black_bed"].id
    ]
}

function dirtArray() {
    return [
        mcData.blocksByName["grass_block"].id,
        mcData.blocksByName["grass_path"].id
    ]
}

// ============================================================================
// CRAFTING FUNCTIONS
// ============================================================================

function craftPlanks(count) {
    log(`Attempting to craft ${count} planks`)
    
    if (hasItem("oak_log")) {
        craftBasic("oak_planks", count)
    } else if (hasItem("spruce_log")) {
        craftBasic("spruce_planks", count)
    } else if (hasItem("birch_log")) {
        craftBasic("birch_planks", count)
    } else if (hasItem("jungle_log")) {
        craftBasic("jungle_planks", count)
    } else if (hasItem("acacia_log")) {
        craftBasic("acacia_planks", count)
    } else if (hasItem("dark_oak_log")) {
        craftBasic("dark_oak_planks", count)
    } else {
        log('No logs available for planks', 'ERROR')
    }
}

function craftBasic(name, amount) {
    const item = mcData.findItemOrBlockByName(name)
    
    if (item) {
        if (canCraft(item, null)) {
            const recipe = bot.recipesFor(item.id, null, null, null)[0]
            
            if (recipe.inShape != null) {
                recipe.inShape = recipe.inShape.reverse()
            }
            
            try {
                bot.craft(recipe, amount, null)
                log(`Crafted ${name} x ${amount}`)
            } catch (err) {
                log(`Failed to craft ${name}: ${err.message}`, 'ERROR')
            }
        } else {
            log(`Cannot craft ${name} - missing materials`, 'WARN')
        }
    } else {
        log(`Unknown item: ${name}`, 'ERROR')
    }
}

async function craftItem(name, amount, table = true) {
    const item = mcData.findItemOrBlockByName(name)
    
    const craftingTable = mcData.blocksByName["crafting_table"]
    const craftingBlock = bot.findBlock({
        matching: craftingTable.id
    })
    
    if (item) {
        if (canCraft(item, craftingBlock)) {
            const recipe = bot.recipesFor(item.id, null, null, craftingBlock)[0]
            
            if (recipe.inShape != null) {
                recipe.inShape = recipe.inShape.reverse()
            }
            
            try {
                await bot.craft(recipe, amount, craftingBlock)
                log(`Crafted ${name} x ${amount}`)
            } catch (err) {
                log(`Failed to craft ${name}: ${err.message}`, 'ERROR')
            }
        } else {
            log(`Cannot craft ${name} - missing materials`, 'WARN')
        }
    } else {
        log(`Unknown item: ${name}`, 'ERROR')
    }
}

function canCraft(item, table) {
    const recipe = bot.recipesFor(item.id, null, 1, table)[0]
    return !!recipe
}

// ============================================================================
// BLOCK INTERACTION FUNCTIONS
// ============================================================================

function findPath() {
    let path = bot.findBlock({
        matching: [mcData.blocksByName["grass_path"].id]
    })
    return path
}

function putBlock(name, block) {
    if (hasItem(name)) {
        equipItem(name, "hand")
        
        log(`Placing ${name} on ${block.position}`)
        bot.placeBlock(block, new Vec3(0, 1, 0), err => {
            if (err) {
                log(`Failed to place ${name}: ${err.message}`, 'ERROR')
            } else {
                log(`Placed ${name}`)
            }
        })
    } else {
        log(`No ${name} in inventory`, 'WARN')
    }
}

function moveToBlock(blockName) {
    const blockType = mcData.blocksByName[blockName]
    
    const goalBlock = bot.findBlock({
        matching: blockType.id,
        maxDistance: 128
    })
    
    if (goalBlock == null) {
        log(`Could not find ${blockName} nearby`, 'WARN')
        return
    }
    
    log(`Moving to ${blockName} at ${goalBlock.position}`)
    const goal = new GoalGetToBlock(goalBlock.position.x, goalBlock.position.y, goalBlock.position.z)
    bot.pathfinder.setGoal(goal)
    
    return goalBlock
}

// ============================================================================
// MINING/COLLECTION FUNCTIONS
// ============================================================================

function collectBlocks(blocks, callback) {
    const targets = []
    for (let i = 0; i < Math.min(blocks.length); i++) {
        targets.push(bot.blockAt(blocks[i]))
    }
    
    log(`Collecting ${targets.length} blocks`)
    bot.collectBlock.collect(targets, err => {
        if (err) {
            log(`Collection error: ${err.message}`, 'ERROR')
        } else {
            log('Collection complete')
        }
        if (callback) callback(err)
    })
}

function mineWood(blocks) {
    const targets = []
    for (let i = 0; i < Math.min(blocks.length); i++) {
        targets.push(bot.blockAt(blocks[i]))
    }
    
    log(`Mining ${targets.length} wood blocks`)
    bot.collectBlock.collect(targets, err => {
        if (err) {
            log(`Mining error: ${err.message}`, 'ERROR')
        } else {
            log('Wood collected successfully')
            state.three_wood = true
            state.doing = false
        }
    })
}

function mineStone() {
    state.three_wood = false
    let stone = bot.findBlocks({
        matching: [mcData.blocksByName["stone"].id, mcData.blocksByName["cobblestone"].id],
        maxDistance: 17,
        count: 3
    })
    
    const targets = []
    for (let i = 0; i < Math.min(stone.length); i++) {
        targets.push(bot.blockAt(stone[i]))
    }
    
    log(`Mining ${targets.length} stone blocks`)
    bot.collectBlock.collect(targets, err => {
        if (err) {
            log(`Mining error: ${err.message}`, 'ERROR')
        } else {
            log('Stone collected successfully')
            if (!state.three_stone) {
                state.three_wood = false
                state.three_stone = true
                state.doing = false
            }
        }
    })
}

function mineSixStone() {
    state.three_wood = false
    let stone = bot.findBlocks({
        matching: [mcData.blocksByName["stone"].id, mcData.blocksByName["cobblestone"].id],
        maxDistance: 17,
        count: 3
    })
    
    const targets = []
    for (let i = 0; i < Math.min(stone.length); i++) {
        targets.push(bot.blockAt(stone[i]))
    }
    
    log(`Mining ${targets.length} more stone blocks`)
    bot.collectBlock.collect(targets, err => {
        if (err) {
            log(`Mining error: ${err.message}`, 'ERROR')
        } else {
            log('Additional stone collected successfully')
            if (!state.six_stone) {
                state.three_stone = false
                state.six_stone = true
                state.doing = false
            }
        }
    })
}

function mineBed(blocks) {
    const targets = []
    for (let i = 0; i < Math.min(blocks.length); i++) {
        targets.push(bot.blockAt(blocks[i]))
    }
    
    log(`Mining bed`)
    bot.collectBlock.collect(targets, err => {
        if (err) {
            log(`Mining error: ${err.message}`, 'ERROR')
        } else {
            state.beds++
            log(`Bed collected - total: ${state.beds}`)
            setTimeout(() => {
                transitionState()
                chooseAction()
            }, 200)
        }
    })
}

function mineChest(blocks) {
    const targets = []
    for (let i = 0; i < Math.min(blocks.length); i++) {
        targets.push(bot.blockAt(blocks[i]))
    }
    
    log(`Mining chest`)
    bot.collectBlock.collect(targets, err => {
        if (err) {
            log(`Mining error: ${err.message}`, 'ERROR')
        } else {
            log('Chest collected')
            state.doing = false
        }
    })
}

function mineHay(blocks) {
    const targets = []
    for (let i = 0; i < Math.min(blocks.length); i++) {
        targets.push(bot.blockAt(blocks[i]))
    }
    
    log(`Mining hay block`)
    bot.collectBlock.collect(targets, err => {
        if (err) {
            log(`Mining error: ${err.message}`, 'ERROR')
        } else {
            state.hays++
            log(`Hay collected - total: ${state.hays}`)
            setTimeout(() => {
                transitionState()
                chooseAction()
            }, 200)
        }
    })
}

function mineDirt() {
    const blocks = bot.findBlocks({
        matching: dirtArray(),
        maxDistance: 128,
        count: 20
    })
    
    const targets = []
    for (let i = 0; i < Math.min(blocks.length, 20); i++) {
        targets.push(bot.blockAt(blocks[i]))
    }
    
    log(`Mining ${targets.length} dirt blocks`)
    bot.collectBlock.collect(targets, err => {
        if (err) {
            log(`Mining error: ${err.message}`, 'ERROR')
        } else {
            state.dirt = 20
            log('Dirt collected - 20 blocks obtained')
            chooseAction()
        }
    })
}

// ============================================================================
// VILLAGE FUNCTIONS
// ============================================================================

function findVillageAutomatically() {
    log('Searching for village automatically (no OP commands)')
    state.villageSearching = true
    state.villageSearchAttempts++
    
    // Look for village indicators: beds, hay, chests, bells
    const villageIndicators = [
        ...bedArray(),
        mcData.blocksByName["hay_block"]?.id,
        mcData.blocksByName["chest"]?.id,
        mcData.blocksByName["bell"]?.id
    ].filter(id => id !== undefined)
    
    const villageBlocks = bot.findBlocks({
        matching: villageIndicators,
        maxDistance: 128,
        count: 10
    })
    
    if (villageBlocks && villageBlocks.length > 3) {
        log(`Found village indicators! ${villageBlocks.length} blocks detected`)
        
        // Calculate center of detected blocks
        let centerX = 0, centerZ = 0
        villageBlocks.forEach(pos => {
            centerX += pos.x
            centerZ += pos.z
        })
        centerX = Math.floor(centerX / villageBlocks.length)
        centerZ = Math.floor(centerZ / villageBlocks.length)
        
        log(`Moving to village center at X:${centerX} Z:${centerZ}`)
        const goal = new GoalNear(centerX, 70, centerZ, 16)
        bot.pathfinder.setGoal(goal)
        state.villageSearching = false
    } else {
        log(`No village found nearby (attempt ${state.villageSearchAttempts})`)
        
        // Spiral search pattern
        const spiralDistance = state.villageSearchAttempts * 64
        const angle = state.villageSearchAttempts * 1.5
        const targetX = Math.floor(bot.entity.position.x + spiralDistance * Math.cos(angle))
        const targetZ = Math.floor(bot.entity.position.z + spiralDistance * Math.sin(angle))
        
        log(`Moving to search position X:${targetX} Z:${targetZ}`)
        const goal = new GoalXZ(targetX, targetZ)
        bot.pathfinder.setGoal(goal)
        
        // Try again after movement
        setTimeout(() => {
            if (!state.atVillage) {
                findVillageAutomatically()
            }
        }, 10000)
    }
}

function raidVillage() {
    log('Raiding village - checking priorities')
    
    let wood, bed, chest, hay
    let woodDist = 64, bedDist = 64, chestDist = 64, hayDist = 64
    
    if (!state.wooden_pick) {
        wood = bot.findBlocks({
            matching: woodArray(),
            maxDistance: 24,
            count: 3
        })
        if (wood[0] != null) {
            woodDist = distance(wood[0], bot.entity.position)
            log(`Wood found at distance ${woodDist.toFixed(2)}`)
        }
    }
    
    if (state.beds < 4) {
        bed = bot.findBlocks({
            matching: bedArray(),
            maxDistance: 64
        })
        if (bed[0] == null) {
            if (state.hays >= 8 && state.chests && state.stone_axe) {
                state.beds = 4
            }
        } else {
            bedDist = distance(bed[0], bot.entity.position)
            log(`Bed found at distance ${bedDist.toFixed(2)}`)
        }
    }
    
    if (!state.chests) {
        chest = bot.findBlocks({
            matching: mcData.blocksByName["chest"].id,
            maxDistance: 64
        })
        if (chest[0] != null) {
            chestDist = distance(chest[0], bot.entity.position)
            log(`Chest found at distance ${chestDist.toFixed(2)}`)
        } else {
            if (state.beds >= 4 && state.hays >= 8 && state.stone_axe) {
                state.chests = true
            }
        }
    }
    
    if (state.hays < 8) {
        hay = bot.findBlocks({
            matching: mcData.blocksByName["hay_block"].id,
            maxDistance: 64
        })
        if (hay[0] == null) {
            if (state.beds >= 4 && state.chests && state.stone_axe) {
                state.hays = 8
            }
        } else {
            hayDist = distance(hay[0], bot.entity.position)
            log(`Hay found at distance ${hayDist.toFixed(2)}`)
        }
    }
    
    const min = Math.min(woodDist, bedDist, chestDist, hayDist, 63)
    
    switch (min) {
        case woodDist:
            if (!state.wooden_pick) {
                log('Priority: Mining wood')
                setTimeout(() => { mineWood(wood) }, 500)
            }
            break
        case bedDist:
            if (state.beds < 4) {
                log('Priority: Getting bed')
                setTimeout(() => { mineBed(bed) }, 500)
            }
            break
        case chestDist:
            if (!state.chests) {
                log('Priority: Getting chest')
                setTimeout(() => { mineChest(chest) }, 500)
            }
            break
        case hayDist:
            if (state.hays < 8) {
                log('Priority: Getting hay')
                setTimeout(() => { mineHay(hay) }, 500)
            }
            break
        default:
            log('All village resources collected')
            transitionState()
            chooseAction()
            break
    }
}

// ============================================================================
// IRON PHASE FUNCTIONS
// ============================================================================

function ironPhase() {
    log('Starting iron phase - looking for iron golem')
    state.current = "ironPhase"
    state.doing = true
    
    const filter = e => e.type === 'mob' && 
                        e.position.distanceTo(bot.entity.position) < 128 &&
                        e.mobType !== 'Armor Stand' && 
                        e.name === "iron_golem"
    
    let iron_golem = bot.nearestEntity(filter)
    
    if (iron_golem != null) {
        log(`Iron golem found at ${iron_golem.position}`)
        state.iron_golem_target = iron_golem
        goToIronGolem(iron_golem)
    } else {
        log('No iron golem found nearby', 'WARN')
        state.doing = false
    }
}

function goToIronGolem(iron_golem) {
    log(`Moving to iron golem at ${iron_golem.position}`)
    const goal = new GoalGetToBlock(iron_golem.position.x, iron_golem.position.y + 6, iron_golem.position.z)
    bot.pathfinder.setGoal(goal)
    state.goingToGolem = true
}

let attackAttempts = 0
const MAX_ATTACK_ATTEMPTS = 50 // Safety limit to prevent infinite recursion

function attackIronGolem() {
    if (state.iron_golem_target != null && attackAttempts < MAX_ATTACK_ATTEMPTS) {
        if (distance(state.iron_golem_target.position, bot.entity.position) > 6.5) {
            goToIronGolem(state.iron_golem_target)
        } else {
            log('Attacking iron golem')
            bot.setControlState("jump", true)
            bot.attack(state.iron_golem_target)
            attackAttempts++
            setTimeout(() => { attackIronGolem() }, 1250)
        }
    } else {
        if (attackAttempts >= MAX_ATTACK_ATTEMPTS) {
            log('Max attack attempts reached, stopping attack', 'WARN')
        }
        attackAttempts = 0
        log('Iron golem defeated')
        bot.setControlState("jump", false)
        
        // Pick up the iron
        const filter1 = e => e.type === 'object' && 
                            e.objectType === "Item" && 
                            e.kind === "Drops" && 
                            e.metadata[7].itemId == 579
        let iron = bot.nearestEntity(filter1)
        
        if (iron != null) {
            log('Collecting dropped iron')
            const goal = new GoalGetToBlock(iron.position.x, iron.position.y, iron.position.z)
            setTimeout(() => {
                bot.pathfinder.setGoal(goal)
            }, 1300)
            state.goingToIron = true
        }
        
        state.golem = true
        state.goingToGolem = false
    }
}

// ============================================================================
// WATER AND GRAVEL FUNCTIONS
// ============================================================================

function getWater() {
    log('Searching for water')
    state.gettingWater = true
    
    let waterBlocks = bot.findBlocks({
        matching: mcData.blocksByName["water"].id,
        maxDistance: 128,
        count: 10
    })
    
    if (waterBlocks[0] != null) {
        log(`Water found at ${waterBlocks[0]}`)
        const goal = new GoalBlock(waterBlocks[0].x, waterBlocks[0].y, waterBlocks[0].z)
        bot.pathfinder.setGoal(goal)
        state.waterBlock = waterBlocks[0]
    } else {
        log('No water found nearby', 'WARN')
        state.gettingWater = false
    }
}

function findGravel() {
    log('Searching for gravel')
    const gravelType = mcData.blocksByName["gravel"]
    
    const gravel = bot.findBlock({
        matching: gravelType.id,
        maxDistance: 128
    })
    
    if (gravel != null) {
        if (gravel.position.y > 59) {
            log(`Gravel found at ${gravel.position}`)
            const targets = [gravel]
            
            bot.collectBlock.collect(targets, err => {
                if (err) {
                    log(`Gravel collection error: ${err.message}`, 'ERROR')
                } else {
                    log('Gravel collected')
                    state.gravel = true
                    state.goingToFlint = true
                    chooseAction()
                }
            })
        } else {
            log('Gravel too deep, looking for another', 'WARN')
        }
    } else {
        log('No gravel found nearby', 'WARN')
    }
}

// ============================================================================
// LAVA AND PORTAL FUNCTIONS
// ============================================================================

function findLava() {
    log('Searching for lava pool for portal')
    
    const lavaPositions = bot.findBlocks({
        matching: mcData.blocksByName["lava"].id,
        maxDistance: 64,
        count: 100
    })
    
    log(`Found ${lavaPositions.length} lava blocks`)
    
    if (lavaPositions.length > 10) {
        // Find surface lava (y > 55)
        const surfaceLava = lavaPositions.filter(pos => pos.y > 55)
        
        if (surfaceLava.length > 0) {
            log(`Found ${surfaceLava.length} surface lava blocks`)
            const targetLava = surfaceLava[0]
            log(`Moving to lava at ${targetLava}`)
            
            const goal = new GoalNear(targetLava.x, targetLava.y, targetLava.z, 3)
            bot.pathfinder.setGoal(goal)
        } else {
            log('No surface lava found, continuing search')
            // Move in a search pattern
            const angle = Math.random() * Math.PI * 2
            const distance = 50
            const targetX = Math.floor(bot.entity.position.x + distance * Math.cos(angle))
            const targetZ = Math.floor(bot.entity.position.z + distance * Math.sin(angle))
            const goal = new GoalXZ(targetX, targetZ)
            bot.pathfinder.setGoal(goal)
            
            setTimeout(() => findLava(), 10000)
        }
    } else {
        log('Not enough lava found, continuing search')
        // Move in a search pattern
        const angle = Math.random() * Math.PI * 2
        const distance = 50
        const targetX = Math.floor(bot.entity.position.x + distance * Math.cos(angle))
        const targetZ = Math.floor(bot.entity.position.z + distance * Math.sin(angle))
        const goal = new GoalXZ(targetX, targetZ)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => findLava(), 10000)
    }
}

async function buildNetherPortal() {
    log('Building Nether portal')
    
    // Find a suitable flat location near lava
    const lavaPositions = bot.findBlocks({
        matching: mcData.blocksByName["lava"].id,
        maxDistance: 32,
        count: 10
    })
    
    if (lavaPositions.length === 0) {
        log('No lava found to build portal', 'ERROR')
        setTimeout(() => findLava(), 5000)
        return
    }
    
    // Build portal using the water bucket on lava method
    const lavaPos = lavaPositions[0]
    log(`Building portal near lava at ${lavaPos}`)
    
    try {
        // Strategy: Place water source blocks to flow onto lava and create obsidian
        // Then build up the portal frame
        
        equipItem("water_bucket", "hand")
        await bot.waitForTicks(20)
        
        log('Creating obsidian blocks by placing water on lava')
        
        // Try to create obsidian by water-lava interaction
        // In a real speedrun, this would be more sophisticated
        // For now, we'll wait and check for obsidian
        
        await bot.waitForTicks(100) // Wait 5 seconds for obsidian formation
        
        // Check if we have obsidian blocks nearby
        const obsidianBlocks = bot.findBlocks({
            matching: mcData.blocksByName["obsidian"].id,
            maxDistance: 16,
            count: 10
        })
        
        if (obsidianBlocks.length >= 10) {
            log(`Found ${obsidianBlocks.length} obsidian blocks - attempting to light portal`)
            
            // Light the portal
            equipItem("flint_and_steel", "hand")
            await bot.waitForTicks(20)
            
            // Find a suitable obsidian block to light from
            const centerObsidian = bot.blockAt(obsidianBlocks[0])
            if (centerObsidian) {
                log('Lighting the Nether portal')
                await bot.lookAt(centerObsidian.position)
                await bot.activateBlock(centerObsidian)
                
                log('Portal lit! Waiting for portal to activate...')
                state.portalBuilt = true
                
                // Enter the portal
                setTimeout(() => enterNetherPortal(), 3000)
            }
        } else {
            log('Not enough obsidian created, retrying...', 'WARN')
            setTimeout(() => buildNetherPortal(), 5000)
        }
        
    } catch (err) {
        log(`Portal building error: ${err.message}`, 'ERROR')
        // Retry after error
        setTimeout(() => buildNetherPortal(), 5000)
    }
}

function enterNetherPortal() {
    log('Entering Nether portal...')
    
    const portalBlock = bot.findBlock({
        matching: mcData.blocksByName["nether_portal"]?.id,
        maxDistance: 16
    })
    
    if (portalBlock) {
        log(`Portal found at ${portalBlock.position}`)
        const goal = new GoalBlock(portalBlock.position.x, portalBlock.position.y, portalBlock.position.z)
        bot.pathfinder.setGoal(goal)
    } else {
        log('Portal block not found, retrying...', 'WARN')
        setTimeout(() => enterNetherPortal(), 2000)
    }
}

// ============================================================================
// NETHER PHASE FUNCTIONS
// ============================================================================

function netherPhase() {
    log('Entered Nether - beginning fortress search')
    state.current = "netherPhase"
    state.inNether = true
    
    // Wait a moment to fully load in Nether
    setTimeout(() => {
        findNetherFortress()
    }, 3000)
}

function findNetherFortress() {
    log('Searching for Nether fortress')
    
    // Look for fortress blocks: nether bricks, nether brick fence, nether brick stairs
    const fortressBlocks = bot.findBlocks({
        matching: [
            mcData.blocksByName["nether_bricks"]?.id,
            mcData.blocksByName["nether_brick_fence"]?.id,
            mcData.blocksByName["nether_brick_stairs"]?.id
        ].filter(id => id !== undefined),
        maxDistance: 128,
        count: 20
    })
    
    if (fortressBlocks && fortressBlocks.length > 5) {
        log(`Found Nether fortress! ${fortressBlocks.length} blocks detected`)
        state.netherFortressFound = true
        
        // Calculate center of fortress blocks
        let centerX = 0, centerY = 0, centerZ = 0
        fortressBlocks.forEach(pos => {
            centerX += pos.x
            centerY += pos.y
            centerZ += pos.z
        })
        centerX = Math.floor(centerX / fortressBlocks.length)
        centerY = Math.floor(centerY / fortressBlocks.length)
        centerZ = Math.floor(centerZ / fortressBlocks.length)
        
        log(`Moving to fortress center at X:${centerX} Y:${centerY} Z:${centerZ}`)
        const goal = new GoalNear(centerX, centerY, centerZ, 8)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => findBlazes(), 5000)
    } else {
        log('No fortress found nearby, continuing search')
        
        // Move in Nether to search for fortress
        const angle = Math.random() * Math.PI * 2
        const distance = 64
        const targetX = Math.floor(bot.entity.position.x + distance * Math.cos(angle))
        const targetZ = Math.floor(bot.entity.position.z + distance * Math.sin(angle))
        const goal = new GoalXZ(targetX, targetZ)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => findNetherFortress(), 10000)
    }
}

let blazeTarget = null
let blazeAttackAttempts = 0
const MAX_BLAZE_ATTACKS = 100

function findBlazes() {
    log('Searching for blazes in fortress')
    
    const filter = e => e.type === 'mob' && 
                        e.position.distanceTo(bot.entity.position) < 64 &&
                        e.name === "blaze"
    
    const blaze = bot.nearestEntity(filter)
    
    if (blaze) {
        log(`Blaze found at ${blaze.position}`)
        blazeTarget = blaze
        attackBlaze()
    } else {
        log('No blaze found, searching...', 'WARN')
        
        // Move around fortress to find blazes
        const angle = Math.random() * Math.PI * 2
        const distance = 20
        const targetX = Math.floor(bot.entity.position.x + distance * Math.cos(angle))
        const targetZ = Math.floor(bot.entity.position.z + distance * Math.sin(angle))
        const goal = new GoalXZ(targetX, targetZ)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => findBlazes(), 5000)
    }
}

function attackBlaze() {
    if (!blazeTarget || blazeAttackAttempts >= MAX_BLAZE_ATTACKS) {
        log('Blaze target lost or max attempts reached')
        blazeAttackAttempts = 0
        
        // Check if we have enough blaze rods
        const blazeRodItem = hasItem("blaze_rod")
        if (blazeRodItem) {
            state.blazeRods = blazeRodItem.count
            log(`Collected ${state.blazeRods} blaze rods`)
        }
        
        if (state.blazeRods >= 6) {
            log('Sufficient blaze rods collected!')
            returnToOverworld()
        } else {
            log(`Need more blaze rods (${state.blazeRods}/6)`)
            setTimeout(() => findBlazes(), 2000)
        }
        return
    }
    
    const dist = distance(blazeTarget.position, bot.entity.position)
    
    if (dist > 4) {
        // Move closer to blaze
        const goal = new GoalNear(blazeTarget.position.x, blazeTarget.position.y, blazeTarget.position.z, 3)
        bot.pathfinder.setGoal(goal)
        setTimeout(() => attackBlaze(), 500)
    } else {
        // Attack the blaze
        equipItem("stone_axe", "hand")
        bot.lookAt(blazeTarget.position.offset(0, 1, 0))
        
        // Jump attack for critical hits
        bot.setControlState("jump", true)
        setTimeout(() => bot.setControlState("jump", false), 100)
        
        bot.attack(blazeTarget)
        blazeAttackAttempts++
        
        // Eat if health is low
        if (bot.health < 12 && hasItem("bread")) {
            try {
                bot.equip(hasItem("bread"), "hand")
                bot.activateItem()
                equipItem("stone_axe", "hand")
            } catch (err) {
                log(`Failed to eat: ${err.message}`, 'ERROR')
            }
        }
        
        setTimeout(() => attackBlaze(), 500)
    }
}

function returnToOverworld() {
    log('Returning to Overworld through portal')
    state.current = "returningToOverworld"
    
    // Find the nether portal
    const portalBlock = bot.findBlock({
        matching: mcData.blocksByName["nether_portal"]?.id,
        maxDistance: 128
    })
    
    if (portalBlock) {
        log(`Portal found at ${portalBlock.position}`)
        const goal = new GoalBlock(portalBlock.position.x, portalBlock.position.y, portalBlock.position.z)
        bot.pathfinder.setGoal(goal)
    } else {
        log('Portal not found, searching...', 'WARN')
        
        // Move towards where we entered
        const angle = Math.random() * Math.PI * 2
        const distance = 32
        const targetX = Math.floor(bot.entity.position.x + distance * Math.cos(angle))
        const targetZ = Math.floor(bot.entity.position.z + distance * Math.sin(angle))
        const goal = new GoalXZ(targetX, targetZ)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => returnToOverworld(), 5000)
    }
}

// ============================================================================
// ENDERMAN HUNTING FUNCTIONS
// ============================================================================

function huntEndermen() {
    log('Starting Enderman hunting phase')
    state.current = "huntingEndermen"
    state.inNether = false
    
    // Craft blaze powder first
    const blazeRodItem = hasItem("blaze_rod")
    if (blazeRodItem) {
        log('Crafting blaze powder from blaze rods')
        craftBasic("blaze_powder", blazeRodItem.count * 2)
        state.blazePowder = blazeRodItem.count * 2
    }
    
    setTimeout(() => findEnderman(), 2000)
}

let endermanTarget = null
let endermanAttackAttempts = 0
const MAX_ENDERMAN_ATTACKS = 100

function findEnderman() {
    log('Searching for Enderman')
    
    const filter = e => e.type === 'mob' && 
                        e.position.distanceTo(bot.entity.position) < 64 &&
                        e.name === "enderman"
    
    const enderman = bot.nearestEntity(filter)
    
    if (enderman) {
        log(`Enderman found at ${enderman.position}`)
        endermanTarget = enderman
        attackEnderman()
    } else {
        log('No enderman found, searching at night...', 'WARN')
        
        // Move to find endermen (they spawn at night in various biomes)
        const angle = Math.random() * Math.PI * 2
        const distance = 40
        const targetX = Math.floor(bot.entity.position.x + distance * Math.cos(angle))
        const targetZ = Math.floor(bot.entity.position.z + distance * Math.sin(angle))
        const goal = new GoalXZ(targetX, targetZ)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => findEnderman(), 5000)
    }
}

function attackEnderman() {
    if (!endermanTarget || endermanAttackAttempts >= MAX_ENDERMAN_ATTACKS) {
        log('Enderman target lost or max attempts reached')
        endermanAttackAttempts = 0
        
        // Check ender pearl count
        const enderPearlItem = hasItem("ender_pearl")
        if (enderPearlItem) {
            state.enderPearls = enderPearlItem.count
            log(`Collected ${state.enderPearls} ender pearls`)
        }
        
        if (state.enderPearls >= 12) {
            log('Sufficient ender pearls collected!')
            craftEyesOfEnder()
        } else {
            log(`Need more ender pearls (${state.enderPearls}/12)`)
            setTimeout(() => findEnderman(), 2000)
        }
        return
    }
    
    const dist = distance(endermanTarget.position, bot.entity.position)
    
    if (dist > 4) {
        // Move closer to enderman
        const goal = new GoalNear(endermanTarget.position.x, endermanTarget.position.y, endermanTarget.position.z, 3)
        bot.pathfinder.setGoal(goal)
        setTimeout(() => attackEnderman(), 500)
    } else {
        // Look at and attack the enderman to provoke it
        bot.lookAt(endermanTarget.position.offset(0, 1.5, 0))
        equipItem("stone_axe", "hand")
        
        // Jump attack for critical hits
        bot.setControlState("jump", true)
        setTimeout(() => bot.setControlState("jump", false), 100)
        
        bot.attack(endermanTarget)
        endermanAttackAttempts++
        
        // Eat if health is low
        if (bot.health < 12 && hasItem("bread")) {
            try {
                bot.equip(hasItem("bread"), "hand")
                bot.activateItem()
                equipItem("stone_axe", "hand")
            } catch (err) {
                log(`Failed to eat: ${err.message}`, 'ERROR')
            }
        }
        
        setTimeout(() => attackEnderman(), 500)
    }
}

function craftEyesOfEnder() {
    log('Crafting Eyes of Ender')
    
    const enderPearlItem = hasItem("ender_pearl")
    const blazePowderItem = hasItem("blaze_powder")
    
    if (enderPearlItem && blazePowderItem) {
        const craftCount = Math.min(enderPearlItem.count, blazePowderItem.count)
        log(`Crafting ${craftCount} Eyes of Ender`)
        
        craftBasic("ender_eye", craftCount)
        state.eyesOfEnder = craftCount
        
        setTimeout(() => findStronghold(), 2000)
    } else {
        log('Missing materials for Eyes of Ender', 'ERROR')
    }
}

// ============================================================================
// STRONGHOLD FINDING FUNCTIONS
// ============================================================================

function findStronghold() {
    log('Using Eye of Ender to locate stronghold')
    state.current = "findingStronghold"
    
    const eyeOfEnder = hasItem("ender_eye")
    
    if (!eyeOfEnder) {
        log('No Eyes of Ender available!', 'ERROR')
        return
    }
    
    // Equip and use eye of ender
    equipItem("ender_eye", "hand")
    
    setTimeout(() => {
        log('Throwing Eye of Ender...')
        bot.activateItem()
        
        // Watch where the eye goes and follow it
        // In a real implementation, we'd track the eye entity
        // For now, we'll move in the general direction
        
        setTimeout(() => {
            // Move towards stronghold (simplified - would need eye tracking)
            log('Following Eye of Ender trajectory')
            
            // After several throws, we'd triangulate the position
            // Simplified: just search underground
            setTimeout(() => digToStronghold(), 5000)
        }, 3000)
    }, 1000)
}

function digToStronghold() {
    log('Digging down to find stronghold')
    state.current = "diggingToStronghold"
    
    // Look for stronghold blocks underground
    const strongholdBlocks = bot.findBlocks({
        matching: [
            mcData.blocksByName["stone_bricks"]?.id,
            mcData.blocksByName["mossy_stone_bricks"]?.id,
            mcData.blocksByName["cracked_stone_bricks"]?.id,
            mcData.blocksByName["iron_bars"]?.id
        ].filter(id => id !== undefined),
        maxDistance: 64,
        count: 10
    })
    
    if (strongholdBlocks && strongholdBlocks.length > 5) {
        log(`Found stronghold blocks! ${strongholdBlocks.length} blocks detected`)
        state.strongholdFound = true
        state.inStronghold = true
        
        // Move into stronghold
        const centerX = Math.floor(strongholdBlocks.reduce((sum, pos) => sum + pos.x, 0) / strongholdBlocks.length)
        const centerY = Math.floor(strongholdBlocks.reduce((sum, pos) => sum + pos.y, 0) / strongholdBlocks.length)
        const centerZ = Math.floor(strongholdBlocks.reduce((sum, pos) => sum + pos.z, 0) / strongholdBlocks.length)
        
        state.strongholdLocation = new Vec3(centerX, centerY, centerZ)
        log(`Moving to stronghold at X:${centerX} Y:${centerY} Z:${centerZ}`)
        
        const goal = new GoalNear(centerX, centerY, centerZ, 5)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => findPortalRoom(), 5000)
    } else {
        log('No stronghold blocks found, continuing search')
        
        // Dig down or search more
        const angle = Math.random() * Math.PI * 2
        const distance = 20
        const targetX = Math.floor(bot.entity.position.x + distance * Math.cos(angle))
        const targetZ = Math.floor(bot.entity.position.z + distance * Math.sin(angle))
        const goal = new GoalXZ(targetX, targetZ)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => digToStronghold(), 8000)
    }
}

function findPortalRoom() {
    log('Searching for End Portal room')
    
    // Look for End portal frame blocks
    const portalFrameBlocks = bot.findBlocks({
        matching: mcData.blocksByName["end_portal_frame"]?.id,
        maxDistance: 64,
        count: 12
    })
    
    if (portalFrameBlocks && portalFrameBlocks.length >= 12) {
        log(`Found End Portal! ${portalFrameBlocks.length} frame blocks detected`)
        state.portalRoomFound = true
        
        // Move to portal
        const centerX = Math.floor(portalFrameBlocks.reduce((sum, pos) => sum + pos.x, 0) / portalFrameBlocks.length)
        const centerY = Math.floor(portalFrameBlocks.reduce((sum, pos) => sum + pos.y, 0) / portalFrameBlocks.length)
        const centerZ = Math.floor(portalFrameBlocks.reduce((sum, pos) => sum + pos.z, 0) / portalFrameBlocks.length)
        
        log(`Moving to End Portal at X:${centerX} Y:${centerY} Z:${centerZ}`)
        const goal = new GoalNear(centerX, centerY, centerZ, 3)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => fillEndPortal(portalFrameBlocks), 3000)
    } else {
        log('Portal room not found, continuing search in stronghold')
        
        // Navigate through stronghold
        const angle = Math.random() * Math.PI * 2
        const distance = 15
        const targetX = Math.floor(bot.entity.position.x + distance * Math.cos(angle))
        const targetZ = Math.floor(bot.entity.position.z + distance * Math.sin(angle))
        const goal = new GoalXZ(targetX, targetZ)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => findPortalRoom(), 5000)
    }
}

function fillEndPortal(portalFrameBlocks) {
    log('Filling End Portal with Eyes of Ender')
    
    // Check each frame block and fill if needed
    let filled = 0
    
    portalFrameBlocks.forEach((pos, index) => {
        const block = bot.blockAt(pos)
        
        // Check if frame already has an eye (metadata check)
        // In Minecraft, filled frames have different properties
        setTimeout(() => {
            equipItem("ender_eye", "hand")
            
            // Place eye of ender on frame
            bot.lookAt(pos)
            setTimeout(() => {
                bot.activateBlock(block)
                filled++
                log(`Placed Eye of Ender ${filled}/12`)
                
                if (filled >= 12) {
                    log('All eyes placed! Portal should be active')
                    setTimeout(() => enterTheEnd(), 2000)
                }
            }, 200)
        }, index * 500)
    })
}

function enterTheEnd() {
    log('Entering The End dimension!')
    state.current = "enteringEnd"
    
    // Find the activated End portal
    const endPortalBlock = bot.findBlock({
        matching: mcData.blocksByName["end_portal"]?.id,
        maxDistance: 16
    })
    
    if (endPortalBlock) {
        log(`End portal found at ${endPortalBlock.position}`)
        const goal = new GoalBlock(endPortalBlock.position.x, endPortalBlock.position.y, endPortalBlock.position.z)
        bot.pathfinder.setGoal(goal)
    } else {
        log('End portal not activated yet, waiting...', 'WARN')
        setTimeout(() => enterTheEnd(), 2000)
    }
}

// ============================================================================
// ENDER DRAGON FIGHT FUNCTIONS
// ============================================================================

function endDragonFight() {
    log('=== ENTERED THE END - DRAGON FIGHT BEGINS ===')
    state.current = "fightingDragon"
    state.inEnd = true
    
    // First priority: destroy End crystals
    setTimeout(() => destroyEndCrystals(), 3000)
}

function destroyEndCrystals() {
    log('Destroying End crystals on obsidian pillars')
    
    // Look for End crystals
    const crystalFilter = e => e.type === 'object' && 
                                e.name === "end_crystal" &&
                                e.position.distanceTo(bot.entity.position) < 128
    
    const crystal = bot.nearestEntity(crystalFilter)
    
    if (crystal) {
        log(`End crystal found at ${crystal.position}`)
        
        // Pillar up if crystal is high
        const heightDiff = crystal.position.y - bot.entity.position.y
        
        if (heightDiff > 10) {
            log(`Crystal is high (${heightDiff} blocks up), pillaring...`)
            pillarUpToCrystal(crystal)
        } else {
            // Shoot or approach and destroy
            approachAndDestroyCrystal(crystal)
        }
    } else {
        log('All End crystals destroyed!')
        state.crystalsDestroyed = 10 // Approximate count
        
        // Now fight the dragon
        setTimeout(() => attackEnderDragon(), 2000)
    }
}

function pillarUpToCrystal(crystal) {
    log('Pillaring up to reach End crystal')
    
    // Use cobblestone to pillar up
    equipItem("cobblestone", "hand")
    
    // Simple pillaring: place blocks below us
    const pillarHeight = Math.floor(crystal.position.y - bot.entity.position.y)
    
    for (let i = 0; i < pillarHeight; i++) {
        setTimeout(() => {
            const blockBelow = bot.blockAt(bot.entity.position.offset(0, -1, 0))
            bot.placeBlock(blockBelow, new Vec3(0, 1, 0))
            bot.setControlState("jump", true)
            setTimeout(() => bot.setControlState("jump", false), 100)
        }, i * 300)
    }
    
    // After pillaring, destroy the crystal
    setTimeout(() => approachAndDestroyCrystal(crystal), pillarHeight * 300 + 1000)
}

function approachAndDestroyCrystal(crystal) {
    log(`Approaching End crystal at ${crystal.position}`)
    
    const dist = distance(crystal.position, bot.entity.position)
    
    if (dist > 8) {
        const goal = new GoalNear(crystal.position.x, crystal.position.y, crystal.position.z, 6)
        bot.pathfinder.setGoal(goal)
        
        setTimeout(() => approachAndDestroyCrystal(crystal), 1000)
    } else {
        // Attack the crystal
        log('Destroying End crystal!')
        bot.lookAt(crystal.position)
        bot.attack(crystal)
        
        // Continue to next crystal
        setTimeout(() => destroyEndCrystals(), 2000)
    }
}

let dragonTarget = null
let dragonAttackAttempts = 0
const MAX_DRAGON_ATTACKS = 500

function attackEnderDragon() {
    log('Attacking Ender Dragon!')
    
    const dragonFilter = e => e.type === 'mob' && 
                               e.name === "ender_dragon"
    
    const dragon = bot.nearestEntity(dragonFilter)
    
    if (!dragon) {
        log('Dragon not found, waiting...', 'WARN')
        setTimeout(() => attackEnderDragon(), 1000)
        return
    }
    
    dragonTarget = dragon
    log(`Dragon located at ${dragon.position}`)
    
    continueAttackingDragon()
}

function continueAttackingDragon() {
    if (!dragonTarget || dragonAttackAttempts >= MAX_DRAGON_ATTACKS) {
        // Check if dragon is defeated
        const dragonFilter = e => e.type === 'mob' && e.name === "ender_dragon"
        const dragon = bot.nearestEntity(dragonFilter)
        
        if (!dragon) {
            log('=== ENDER DRAGON DEFEATED! ===', 'STATUS')
            state.dragonDefeated = true
            victorySequence()
            return
        }
        
        dragonAttackAttempts = 0
        dragonTarget = dragon
    }
    
    const dist = distance(dragonTarget.position, bot.entity.position)
    
    // Attack when dragon is perched or close
    if (dist < 20) {
        log('Dragon in range - attacking!')
        equipItem("stone_axe", "hand")
        bot.lookAt(dragonTarget.position.offset(0, 1, 0))
        
        // Jump and attack for critical hits
        bot.setControlState("jump", true)
        setTimeout(() => bot.setControlState("jump", false), 100)
        
        bot.attack(dragonTarget)
        dragonAttackAttempts++
    } else {
        log(`Dragon far away (${dist.toFixed(1)} blocks), waiting for perch...`)
        
        // Move towards dragon's general area
        if (dist > 50) {
            const goal = new GoalNear(dragonTarget.position.x, dragonTarget.position.y, dragonTarget.position.z, 20)
            bot.pathfinder.setGoal(goal)
        }
    }
    
    // Eat if health is low
    if (bot.health < 15 && hasItem("bread")) {
        log('Combat healing - eating bread')
        try {
            bot.equip(hasItem("bread"), "hand")
            bot.activateItem()
        } catch (err) {
            log(`Failed to eat: ${err.message}`, 'ERROR')
        }
    }
    
    // Continue attacking
    setTimeout(() => continueAttackingDragon(), 800)
}

function victorySequence() {
    log('=== SPEEDRUN COMPLETE! ===', 'STATUS')
    log('Ender Dragon has been defeated!', 'STATUS')
    log(`Time to completion: ${new Date().toISOString()}`, 'STATUS')
    
    // Find and enter the exit portal
    const exitPortalBlock = bot.findBlock({
        matching: mcData.blocksByName["end_portal"]?.id,
        maxDistance: 64
    })
    
    if (exitPortalBlock) {
        log('Entering exit portal...')
        const goal = new GoalBlock(exitPortalBlock.position.x, exitPortalBlock.position.y, exitPortalBlock.position.z)
        bot.pathfinder.setGoal(goal)
    }
    
    log('=== MINECRAFT SPEEDRUN BOT: MISSION ACCOMPLISHED! ===', 'STATUS')
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

// Cache bed names for performance
const bedNames = [
    "white_bed", "orange_bed", "magenta_bed", "light_blue_bed",
    "yellow_bed", "lime_bed", "pink_bed", "gray_bed",
    "light_gray_bed", "cyan_bed", "purple_bed", "blue_bed",
    "brown_bed", "green_bed", "red_bed", "black_bed"
]

function clearInventory() {
    log('Clearing non-essential items from inventory')
    
    const essentials = [
        "wooden_pickaxe", "stone_pickaxe", "iron_pickaxe",
        "stone_axe", "stone_hoe", "bucket", "water_bucket",
        "bread", "hay_block", "wheat", "cobblestone",
        "crafting_table", "stick", "lava_bucket", "dirt",
        "oak_log", "spruce_log", "birch_log", "jungle_log",
        "acacia_log", "dark_oak_log",
        "oak_planks", "spruce_planks", "birch_planks",
        "jungle_planks", "acacia_planks", "dark_oak_planks",
        "flint_and_steel",
        ...bedNames
    ]
    
    const inv = bot.inventory.items()
    for (let i = 0; i < inv.length; i++) {
        setTimeout(() => {
            const item = inv[i]
            if (essentials.indexOf(item.name) === -1) {
                bot.tossStack(item)
                log(`Tossed ${item.name}`)
            }
        }, 50 * i)
    }
    
    setTimeout(() => sayItems(), 50 * inv.length + 100)
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

function transitionState() {
    const oldState = state.current
    
    switch (state.current) {
        case "goingToVillage":
            if (state.atVillage) {
                state.current = "raidingVillage"
                log(`State transition: ${oldState} -> ${state.current}`)
            }
            break
            
        case "raidingVillage":
            log(`Village raid status - Beds: ${state.beds}, Chests: ${state.chests}, Axe: ${state.stone_axe}, Hay: ${state.hays}`)
            if (state.beds >= 4 && state.chests && state.stone_axe && state.hays >= 8) {
                state.current = "ironPhase"
                log(`State transition: ${oldState} -> ${state.current}`)
            }
            break
            
        case "ironPhase":
            if (state.flint && state.water && state.bread) {
                log('Iron phase complete - preparing for lava phase')
                clearInventory()
                setTimeout(() => {
                    state.current = "lavaPhase"
                    log(`State transition: ${oldState} -> ${state.current}`)
                }, 1500)
            }
            break
            
        case "lavaPhase":
            if (state.portalBuilt) {
                state.current = "netherPhase"
                log(`State transition: ${oldState} -> ${state.current}`)
            }
            break
            
        case "netherPhase":
            if (state.blazeRods >= 6) {
                state.current = "returningToOverworld"
                log(`State transition: ${oldState} -> ${state.current}`)
            }
            break
            
        case "returningToOverworld":
            if (!state.inNether) {
                state.current = "huntingEndermen"
                log(`State transition: ${oldState} -> ${state.current}`)
            }
            break
            
        case "huntingEndermen":
            if (state.eyesOfEnder >= 12) {
                state.current = "findingStronghold"
                log(`State transition: ${oldState} -> ${state.current}`)
            }
            break
            
        case "findingStronghold":
            if (state.strongholdFound) {
                state.current = "diggingToStronghold"
                log(`State transition: ${oldState} -> ${state.current}`)
            }
            break
            
        case "diggingToStronghold":
            if (state.portalRoomFound) {
                state.current = "enteringEnd"
                log(`State transition: ${oldState} -> ${state.current}`)
            }
            break
            
        case "enteringEnd":
            if (state.inEnd) {
                state.current = "fightingDragon"
                log(`State transition: ${oldState} -> ${state.current}`)
            }
            break
    }
}

function chooseAction() {
    log(`Choosing action in state: ${state.current}`)
    
    switch (state.current) {
        case "raidingVillage":
            if (state.three_wood) {
                log('Action: Crafting initial tools')
                state.doing = true
                setTimeout(() => { craftPlanks(3) }, 1000)
                setTimeout(() => { craftBasic("stick", 2) }, 2000)
                setTimeout(() => { craftBasic("crafting_table", 1) }, 3000)
                setTimeout(() => { equipItem("crafting_table", "hand") }, 3500)
                setTimeout(() => {
                    const path = findPath()
                    if (path) {
                        const goal = new GoalNear(path.position.x, path.position.y, path.position.z, 3)
                        bot.pathfinder.setGoal(goal)
                        state.goingToCraft = true
                    }
                }, 4000)
            } else if (state.three_stone) {
                log('Action: Moving to crafting table for stone tools')
                state.doing = true
                setTimeout(() => {
                    moveToBlock("crafting_table")
                    state.goingToCraft = true
                }, 500)
            } else if (state.six_stone) {
                log('Action: Moving to crafting table for stone axe')
                state.doing = true
                setTimeout(() => {
                    moveToBlock("crafting_table")
                    state.goingToCraft = true
                }, 500)
            } else {
                log('Action: Continue raiding village')
                state.doing = true
                raidVillage()
            }
            break
            
        case "ironPhase":
            if (state.dirt < 20) {
                log('Action: Mining dirt')
                state.doing = true
                mineDirt()
            } else if (!state.golem) {
                log('Action: Starting iron golem hunt')
                ironPhase()
            } else if (state.iron < 4) {
                log('Action: Need more iron')
                ironPhase()
            } else if (state.bread && state.bucket && !state.water) {
                log('Action: Getting water')
                getWater()
            } else if (state.water && !state.gravel) {
                log('Action: Finding gravel')
                state.doing = true
                findGravel()
            } else if (state.flint) {
                log('Action: Crafting flint and steel')
                setTimeout(() => { craftBasic("flint_and_steel", 1) }, 500)
                setTimeout(() => {
                    transitionState()
                    chooseAction()
                }, 1000)
            } else if (!state.flint) {
                if (hasItem("gravel")) {
                    log('Action: Placing gravel to get flint')
                    setTimeout(() => {
                        const path = findPath()
                        if (path) {
                            const goal = new GoalNear(path.position.x, path.position.y, path.position.z, 2)
                            bot.pathfinder.setGoal(goal)
                            state.goingToCraft = true
                        }
                    }, 1000)
                }
            }
            break
            
        case "lavaPhase":
            log('Action: Finding lava for portal')
            findLava()
            break
            
        case "netherPhase":
            if (!state.netherFortressFound) {
                log('Action: Finding Nether fortress')
                findNetherFortress()
            } else if (state.blazeRods < 6) {
                log('Action: Hunting blazes')
                findBlazes()
            }
            break
            
        case "returningToOverworld":
            log('Action: Returning through portal')
            returnToOverworld()
            break
            
        case "huntingEndermen":
            log('Action: Hunting endermen')
            findEnderman()
            break
            
        case "findingStronghold":
            log('Action: Using Eyes of Ender')
            findStronghold()
            break
            
        case "diggingToStronghold":
            log('Action: Searching for stronghold')
            digToStronghold()
            break
            
        case "enteringEnd":
            log('Action: Entering The End')
            enterTheEnd()
            break
            
        case "fightingDragon":
            log('Action: Fighting Ender Dragon')
            // Dragon fight continues automatically
            break
    }
}

// ============================================================================
// BOT EVENT HANDLERS
// ============================================================================

bot.once("spawn", () => {
    log('Bot spawned in world')
    mcData = require("minecraft-data")(bot.version)
    
    log('Loading plugins')
    bot.loadPlugin(pathfinder)
    bot.loadPlugin(require('mineflayer-collectblock').plugin)
    
    const movements = new Movements(bot, mcData)
    movements.scaffoldingBlocks.push(mcData.blocksByName.cobblestone.id)
    bot.pathfinder.setMovements(movements)
    
    log('Bot initialized successfully')
    log(`Position: X:${bot.entity.position.x.toFixed(2)} Y:${bot.entity.position.y.toFixed(2)} Z:${bot.entity.position.z.toFixed(2)}`)
    sayItems()
    
    // Start the speedrun!
    state.current = "goingToVillage"
    log('Starting speedrun - looking for village')
    setTimeout(() => findVillageAutomatically(), 2000)
})

bot.on("goal_reached", () => {
    log(`Goal reached in state: ${state.current}`)
    
    switch (state.current) {
        case "goingToVillage":
            state.atVillage = true
            log('Arrived at village!')
            break
            
        case "raidingVillage":
            if (state.goingToCraft) {
                if (state.three_wood) {
                    log('Crafting wooden pickaxe')
                    setTimeout(() => { putBlock("crafting_table", findPath()) }, 500)
                    setTimeout(() => { craftItem("wooden_pickaxe", 1) }, 1500)
                    setTimeout(() => { mineStone() }, 3000)
                    state.wooden_pick = true
                    state.three_wood = false
                } else if (state.three_stone) {
                    log('Crafting stone pickaxe')
                    setTimeout(() => { craftItem("stone_pickaxe", 1) }, 500)
                    setTimeout(() => { mineSixStone() }, 1500)
                    state.three_stone = false
                } else if (state.six_stone) {
                    log('Crafting stone axe')
                    setTimeout(() => { craftItem("stone_axe", 1) }, 500)
                    setTimeout(() => {
                        state.stone_axe = true
                        chooseAction()
                    }, 1500)
                    state.six_stone = false
                }
                state.goingToCraft = false
            }
            break
            
        case "ironPhase":
            if (state.goingToCraft) {
                if (!state.bread || !state.bucket) {
                    // Craft wheat first, then bread, then bucket
                    // Timing constants for sequential crafting
                    const WHEAT_CRAFT_DELAY = 9000  // 9 seconds for wheat crafting
                    const BREAD_CRAFT_START = 9000  // Start bread after wheat
                    const BUCKET_CRAFT_START = 34500 // Start bucket after bread (~25s for bread crafting)
                    const ACTION_CONTINUE_DELAY = 35500 // Continue after all crafting
                    
                    log('Crafting bread and bucket')
                    craftItem("wheat", state.hays)
                    setTimeout(() => { craftItem("bread", state.hays * 3) }, BREAD_CRAFT_START)
                    setTimeout(() => { craftItem("bucket", 1) }, BUCKET_CRAFT_START)
                    state.bread = true
                    state.bucket = true
                    setTimeout(() => { chooseAction() }, ACTION_CONTINUE_DELAY)
                } else if (state.gravel && !state.flint) {
                    state.placeGravelHere = findPath()
                    putBlock("gravel", state.placeGravelHere)
                    setTimeout(() => { findGravel() }, 1000)
                }
                state.goingToCraft = false
            } else {
                if (!state.golem && state.goingToGolem) {
                    log('Reached golem - preparing to attack')
                    setTimeout(() => { equipItem("stone_axe", "hand") }, 200)
                    setTimeout(() => { attackIronGolem() }, 1000)
                    state.goingToGolem = false
                } else if (state.gettingWater) {
                    log('Reached water - filling bucket')
                    equipItem("bucket", "hand")
                    setTimeout(() => {
                        bot.lookAt(state.waterBlock, true, () => {
                            log('Filling bucket with water')
                            setTimeout(() => {
                                bot.activateItem()
                                state.water = true
                            }, 500)
                        })
                    }, 1000)
                    state.gettingWater = false
                    setTimeout(() => { chooseAction() }, 2000)
                } else if (state.goingToIron) {
                    log('Reached iron drop')
                    let ironCount = 0
                    if (hasItem("iron_ingot")) {
                        ironCount = hasItem("iron_ingot").count
                        log(`Collected iron ingots: ${ironCount}`)
                        state.iron += ironCount
                    }
                    
                    if (state.iron < 4) {
                        log('Need more iron - hunting another golem')
                        state.golem = false
                        setTimeout(() => { ironPhase() }, 500)
                    } else {
                        log('Sufficient iron collected')
                        state.golem = true
                        setTimeout(() => {
                            moveToBlock("crafting_table")
                            state.goingToCraft = true
                        }, 1000)
                    }
                    
                    state.goingToIron = false
                } else if (state.goingToFlint) {
                    if (hasItem("flint")) {
                        log('Got flint!')
                        state.flint = true
                        chooseAction()
                    }
                    state.goingToFlint = false
                } else {
                    chooseAction()
                }
            }
            break
            
        case "lavaPhase":
            log('Reached lava pool - building portal')
            setTimeout(() => buildNetherPortal(), 1000)
            break
            
        case "netherPhase":
            // Handled in specific functions
            break
            
        case "returningToOverworld":
            // Portal reached, waiting for dimension change
            break
            
        case "doing":
            state.doing = false
            break
    }
})

bot.on("physicTick", () => {
    if (!state.doing) {
        transitionState()
        chooseAction()
    }
    
    // Auto-sprint when going to village
    if (state.current === "goingToVillage") {
        bot.setControlState("sprint", true)
    }
})

bot.on("diggingCompleted", () => {
    log('Block mining completed')
})

bot.on("entityGone", e => {
    if (e === state.iron_golem_target) {
        log('Iron golem entity gone')
        state.iron_golem_target = null
        attackIronGolem()
    } else if (e === blazeTarget) {
        log('Blaze entity gone')
        blazeTarget = null
    } else if (e === endermanTarget) {
        log('Enderman entity gone')
        endermanTarget = null
    }
})

// Handle dimension changes
bot.on("forcedMove", () => {
    log('Position changed (possibly dimension travel)')
    
    // Check current dimension
    setTimeout(() => {
        const currentDimension = bot.game.dimension
        log(`Current dimension: ${currentDimension}`)
        
        if (currentDimension === 'minecraft:the_nether' || currentDimension === -1) {
            if (!state.inNether && state.current === "lavaPhase") {
                log('Entered the Nether!')
                netherPhase()
            }
        } else if (currentDimension === 'minecraft:overworld' || currentDimension === 0) {
            if (state.inNether && state.current === "returningToOverworld") {
                log('Returned to Overworld!')
                huntEndermen()
            }
        } else if (currentDimension === 'minecraft:the_end' || currentDimension === 1) {
            if (!state.inEnd && state.current === "enteringEnd") {
                log('Entered The End!')
                endDragonFight()
            }
        }
    }, 2000)
})

// Handle spawn events (including dimension changes)
bot.on("spawn", () => {
    // Check if this is initial spawn or dimension change
    if (mcData) {
        const currentDimension = bot.game.dimension
        log(`Spawned in dimension: ${currentDimension}`)
        
        if (currentDimension === 'minecraft:the_nether' || currentDimension === -1) {
            if (!state.inNether && (state.current === "lavaPhase" || state.portalBuilt)) {
                log('Spawned in Nether after portal travel')
                netherPhase()
            }
        } else if (currentDimension === 'minecraft:the_end' || currentDimension === 1) {
            if (!state.inEnd && state.current === "enteringEnd") {
                log('Spawned in The End')
                endDragonFight()
            }
        }
    }
})

bot.on("health", () => {
    log(`Health: ${bot.health.toFixed(1)}/20, Food: ${bot.food}/20`, 'STATUS')
    
    if (bot.health < 10) {
        log('Health critical!', 'WARN')
        
        // Try to eat bread if available
        if (hasItem("bread")) {
            log('Eating bread to restore health')
            try {
                bot.equip(hasItem("bread"), "hand")
                bot.activateItem()
            } catch (err) {
                log(`Failed to eat: ${err.message}`, 'ERROR')
            }
        }
    }
    
    // Eat when food is low (during combat especially)
    if (bot.food < 10 && (state.current === "fightingDragon" || state.current === "netherPhase" || state.current === "huntingEndermen")) {
        if (hasItem("bread")) {
            log('Food low - eating bread')
            try {
                bot.equip(hasItem("bread"), "hand")
                bot.activateItem()
            } catch (err) {
                log(`Failed to eat: ${err.message}`, 'ERROR')
            }
        }
    }
})

bot.on("death", () => {
    log('Bot died!', 'ERROR')
    state.current = "dead"
})

bot.on("kicked", (reason) => {
    log(`Kicked from server: ${reason}`, 'ERROR')
})

bot.on("error", (err) => {
    log(`Bot error: ${err.message}`, 'ERROR')
})

bot.on("end", () => {
    log('Bot disconnected', 'INFO')
})

// Graceful shutdown
process.on('SIGINT', () => {
    log('Shutting down bot...')
    bot.quit()
    process.exit(0)
})

log('Bot script loaded - waiting for spawn...')
