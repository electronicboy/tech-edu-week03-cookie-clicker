const UPGRADE_API = "https://cookie-upgrade-api.vercel.app/api/upgrades"

const TICK_RATE = 1;

let townDown = false;
/**
 * @type {{cookies: number, upgrades: []}}
 */
let gameState = {}

/**
 *
 * @type {[{id: number, name: string, cost: number, increase: number}]}
 */
let upgrades = null;
/** @type {number} */
let cachedCPS = -1;

/********************************
 ERROR HANDLING LOGIC
 ********************************/

/**
 *
 * @param error {any | null}
 * @param wasReadingSaveData {boolean}
 */
function teardown(error, wasReadingSaveData) {
    townDown = true;
    let containerElement = document.body;
    for (let child of containerElement.children) {
        child.remove()
    }
    let htmlHeadingElement = document.createElement('h1');
    htmlHeadingElement.textContent = "An internal error occurred while attempting to load!"
    containerElement.appendChild(htmlHeadingElement);
    if (error) {
        let errorContents = document.createElement('pre');
        errorContents.textContent = error;
        containerElement.appendChild(errorContents);
    }
    if (wasReadingSaveData) {
        const resetDataButton = document.createElement('button')
        resetDataButton.textContent = "Reset player data"
        resetDataButton.addEventListener('click', () => {
            removePlayerData();
            location.reload()
        })
        containerElement.appendChild(resetDataButton);
    }
}

/****************************
 Player data handling
 *****************************/

function savePlayerData() {
    localStorage.setItem("player_data", JSON.stringify(gameState));
}

function removePlayerData() {
    localStorage.removeItem("player_data");
}

/**
 *
 * @return {{cookies: number, upgrades: []} | null}
 */

function loadPlayerData() {
    const localStorageData = localStorage.getItem("player_data")
    if (localStorageData != null) {
        return JSON.parse(localStorageData);
    }
    return null;
}

/**
 * @return {Promise<[{id: number, name: string, cost: number, increase: number}]>}
 */
async function fetchUpgrades() {
    const resPromise = fetch(UPGRADE_API);
    return resPromise.then((response) => {
        if (response) {
            return response.json();
        } else {
            return null;
        }
    }).catch((err) => {
        teardown(err, false);
        console.dir(err)
        return null;
    });
}

function updateCPS() {
    let cps = 1;
    if (gameState.upgrades != null) {
        for (let upgrade of upgrades) {
            let totalUpgrade = gameState.upgrades[upgrade.id];
            if (totalUpgrade) {
                cps += upgrade.increase * totalUpgrade;
            }
        }
    }
    cachedCPS = cps;

}


function doTickLoop() {

}


fetchUpgrades().then(fetchedUpgrades => {
    if (townDown) return; // Safeguard, don't do anything if we've been torndown!
    if (fetchedUpgrades !== null) {
        upgrades = fetchedUpgrades;
        console.log(upgrades);
        try {
            const loadedPlayerData = loadPlayerData()
            if (loadedPlayerData != null) {
                gameState = loadedPlayerData;
            }
            // We have got everything loaded, time to bootstrap and init the loop!
            setInterval(doTickLoop, 1000 / TICK_RATE)
            updateCPS();
        } catch (e) {
            teardown(e, true);
            return
        }
    }
})
