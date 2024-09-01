const UPGRADE_API = "https://cookie-upgrade-api.vercel.app/api/upgrades"

const TICK_RATE = 10;

let tornDown = false;
/**
 * @type {{cookies: number, upgrades: number[]}}
 */
let gameState = {
    cookies: 0, upgrades: []
}

/**
 *
 * @type {[{id: number, name: string, cost: number, increase: number}]}
 */
let upgrades = null;
/**
 *
 * @type {{button: HTMLButtonElement, ownInfo: HTMLSpanElement}[]}
 */
let storedUpgradeElements = []

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
    tornDown = true;
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

let tick = 0;

function giveCookie() {
    gameState.cookies += (cachedCPS / TICK_RATE);
}

document.getElementById('cookie').addEventListener('click', () => {
    giveCookie()
    const audioCtx = new Audio("./assets/ui-click-97915.mp3");
    audioCtx.play()
})

function doTickLoop() {
    if (tornDown) return // torn down? bail out
    giveCookie();
    updateUI();

    if (tick % (TICK_RATE) === 0) {
        savePlayerData()
    }
    tick++
}

const cookieCPSDisplay = document.getElementById('cookie-cps');
const cookieDisplay = document.getElementById('cookie-display');

function updateUI() {
    cookieCPSDisplay.textContent = Math.floor(cachedCPS).toString(10);
    cookieDisplay.textContent = Math.floor(gameState.cookies).toString(10);

    for (let upgrade of upgrades) {
        const upgradeMeta = storedUpgradeElements[upgrade.id];
        let currentTier = 0;
        const upgradeState = gameState.upgrades[upgrade.id]
        if (upgradeState) {
            currentTier = upgradeState;
        }
        upgradeMeta.ownInfo.textContent = currentTier;

            if (upgrade.cost > gameState.cookies) {
                upgradeMeta.button.classList.add("disabled")
            } else {
                upgradeMeta.button.classList.remove("disabled")
            }

    }

}


fetchUpgrades().then(fetchedUpgrades => {
    if (tornDown) return; // Safeguard, don't do anything if we've been torndown!
    if (fetchedUpgrades !== null) {
        upgrades = fetchedUpgrades;
        try {
            const loadedPlayerData = loadPlayerData()
            if (loadedPlayerData != null) {
                gameState = loadedPlayerData;
            }
            // We have got everything loaded, time to bootstrap and init the loop!
            setInterval(doTickLoop, 1000 / TICK_RATE)
            updateCPS();
            generateUpdateUI();
        } catch (e) {
            teardown(e, true);
            return
        }
    }
})

// https://stackoverflow.com/questions/38045560/animate-css-shake-effect-not-working-every-time
/**
 *
 * @param button {HTMLButtonElement}
 */
function shakeButton(button) {
    console.log('Shaking button')
    button.classList.add("shake");
    setTimeout(() => {
        button.classList.remove("shake");
    }, 1000);
}


function generateUpdateUI() {
    let upgradesElement = document.getElementById('upgrades');
    let upgradeHeaderElement = document.createElement('div');
    upgradeHeaderElement.classList.add('upgradeItemHeader');
    for (let header of ["Upgrade", "increase", "owned", "buy"]) {
        let headerItemElement = document.createElement('span');
        headerItemElement.textContent = header;
        upgradeHeaderElement.appendChild(headerItemElement);
    }
    upgradesElement.appendChild(upgradeHeaderElement);
    for (let upgrade of upgrades) {
        const upgradeDiv = document.createElement('div');
        upgradeDiv.classList.add('upgradeItem');

        const nameElement = document.createElement('span');
        nameElement.textContent = upgrade.name;

        const increaseInfoElement = document.createElement('span');
        increaseInfoElement.textContent = upgrade.increase;
        const ownedInfoElement = document.createElement('span');

        const buyButtonElement = document.createElement('button');
        buyButtonElement.addEventListener('click', () => {
            if (!handleUpgrade(upgrade)) {
                shakeButton(buyButtonElement)
            }

        })
        buyButtonElement.textContent = `Buy 🍪${upgrade.cost}`
        storedUpgradeElements[upgrade.id] = {
            button: buyButtonElement,
            ownInfo: ownedInfoElement

        }

        upgradeDiv.appendChild(nameElement);
        upgradeDiv.appendChild(increaseInfoElement);
        upgradeDiv.appendChild(ownedInfoElement);
        upgradeDiv.appendChild(buyButtonElement);
        upgradesElement.appendChild(upgradeDiv);

    }
}

/**
 *
 * @param upgrade {{id: number, name: string, cost: number, increase: number}}
 * @returns {boolean} if the upgrade was successful
 */
function handleUpgrade(upgrade) {
    if (gameState.cookies >= upgrade.cost) {
        gameState.cookies -= upgrade.cost;

        let currentTier = gameState.upgrades[upgrade.id];
        if (currentTier == null) {
            currentTier = 0
        }
        currentTier++;
        gameState.upgrades[upgrade.id] = currentTier;

        updateCPS();
        savePlayerData();
        new Audio("./assets/cash-register-purchase-87313.mp3").play().catch((err) => {});
        return true;
    } else {
        return false;
    }
}
