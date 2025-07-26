// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let gameState = {
    player: {
        x: 150,
        y: canvas.height / 2,
        vx: 0,
        vy: 0,
        speed: 2,
        sprintSpeed: 4,
        stamina: 100,
        maxStamina: 100,
        hasBall: true,
        dodgeCooldown: 0,
        facing: 1 // 1 for right, -1 for left
    },
    ball: {
        x: 150,
        y: canvas.height / 2,
        vx: 0,
        vy: 0,
        inPlay: true
    },
    goal: {
        x: canvas.width - 100,
        y: canvas.height / 2,
        width: 80,
        height: 120
    },
    opponents: [],
    teammates: [],
    shotClock: 30,
    shotClockActive: false,
    score: { home: 0, away: 0 },
    gameRunning: false,
    powerCharging: false,
    powerLevel: 0
};

// Input handling
let input = {
    mouse: { x: 0, y: 0, active: false },
    keys: {
        shift: false,
        space: false,
        p: false,
        d: false
    }
};

// Mouse controls
let mousePos = { x: 0, y: 0 };

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'ShiftLeft':
        case 'ShiftRight':
            input.keys.shift = true;
            break;
        case 'Space':
            e.preventDefault(); // Prevent page scroll
            if (!input.keys.space && gameState.player.hasBall) {
                startPowerShot();
            }
            input.keys.space = true;
            break;
        case 'KeyP':
            input.keys.p = true;
            break;
        case 'KeyD':
            if (gameState.player.dodgeCooldown <= 0) {
                input.keys.d = true;
                gameState.player.dodgeCooldown = 60;
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'ShiftLeft':
        case 'ShiftRight':
            input.keys.shift = false;
            break;
        case 'Space':
            if (input.keys.space) {
                releasePowerShot();
            }
            input.keys.space = false;
            break;
        case 'KeyP':
            input.keys.p = false;
            break;
        case 'KeyD':
            input.keys.d = false;
            break;
    }
});

// Initialize game objects
function initGame() {
    // Create opponents
    gameState.opponents = [
        { x: 300, y: 200, vx: 0, vy: 0, type: 'defender' },
        { x: 400, y: 300, vx: 0, vy: 0, type: 'defender' },
        { x: 500, y: 250, vx: 0, vy: 0, type: 'defender' }
    ];

    // Create teammates
    gameState.teammates = [
        { x: 200, y: 150, vx: 0, vy: 0, type: 'attacker' },
        { x: 250, y: 350, vx: 0, vy: 0, type: 'attacker' }
    ];

    // Position goal
    gameState.goal.x = canvas.width - 100;
    gameState.goal.y = canvas.height / 2 - 60;
}

// Power shot functions
function startPowerShot() {
    if (gameState.player.hasBall) {
        gameState.powerCharging = true;
        gameState.powerLevel = 0;
        document.getElementById('powerMeter').style.display = 'block';
    }
}

function releasePowerShot() {
    if (gameState.powerCharging) {
        shootBall();
        gameState.powerCharging = false;
        document.getElementById('powerMeter').style.display = 'none';
    }
}

function shootBall() {
    const player = gameState.player;
    const goalCenterX = gameState.goal.x + gameState.goal.width / 2;
    const goalCenterY = gameState.goal.y + gameState.goal.height / 2;
    
    const dx = goalCenterX - player.x;
    const dy = goalCenterY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const power = Math.max(0.1, gameState.powerLevel);
    const speed = 5 + (power * 10);
    
    gameState.ball.vx = (dx / distance) * speed;
    gameState.ball.vy = (dy / distance) * speed;
    player.hasBall = false;
    gameState.powerLevel = 0;
}

// Game logic
function updatePlayer() {
    const player = gameState.player;
    
    // Calculate direction from player to mouse
    const dx = mousePos.x - player.x;
    const dy = mousePos.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Move toward mouse if it's far enough away
    if (distance > 20) {
        const speed = input.keys.shift && player.stamina > 0 ? player.sprintSpeed : player.speed;
        
        player.vx = (dx / distance) * speed;
        player.vy = (dy / distance) * speed;
        
        // Update facing direction
        player.facing = dx > 0 ? 1 : -1;
        
        // Drain stamina when sprinting
        if (input.keys.shift) {
            player.stamina = Math.max(0, player.stamina - 1);
        }
    } else {
        player.vx *= 0.8; // Friction
        player.vy *= 0.8;
    }
    
    // Regenerate stamina
    if (!input.keys.shift) {
        player.stamina = Math.min(player.maxStamina, player.stamina + 0.5);
    }
    
    // Handle dodge
    if (input.keys.d && player.dodgeCooldown <= 0) {
        // Dodge in direction away from nearest opponent
        let nearestOpponent = null;
        let minDistance = Infinity;
        
        gameState.opponents.forEach(opponent => {
            const dist = Math.sqrt(
                Math.pow(opponent.x - player.x, 2) + 
                Math.pow(opponent.y - player.y, 2)
            );
            if (dist < minDistance) {
                minDistance = dist;
                nearestOpponent = opponent;
            }
        });
        
        if (nearestOpponent) {
            const dodgeX = player.x - nearestOpponent.x;
            const dodgeY = player.y - nearestOpponent.y;
            const dodgeDistance = Math.sqrt(dodgeX * dodgeX + dodgeY * dodgeY);
            
            player.vx += (dodgeX / dodgeDistance) * 6;
            player.vy += (dodgeY / dodgeDistance) * 6;
        } else {
            // Random dodge if no opponents nearby
            player.vx += (Math.random() - 0.5) * 8;
            player.vy += (Math.random() - 0.5) * 8;
        }
        
        input.keys.d = false;
    }
    
    // Update dodge cooldown
    if (player.dodgeCooldown > 0) {
        player.dodgeCooldown--;
    }
    
    // Update position
    player.x += player.vx;
    player.y += player.vy;
    
    // Boundary checking
    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));
    
    // Update ball position if player has it
    if (player.hasBall) {
        gameState.ball.x = player.x + (player.facing * 15);
        gameState.ball.y = player.y;
    }
}

function handleActions() {
    const player = gameState.player;
    
    // Handle passing
    if (input.keys.p && player.hasBall) {
        // Find nearest teammate
        let nearestTeammate = null;
        let minDistance = Infinity;
        
        gameState.teammates.forEach(teammate => {
            const distance = Math.sqrt(
                Math.pow(teammate.x - player.x, 2) + 
                Math.pow(teammate.y - player.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestTeammate = teammate;
            }
        });
        
        if (nearestTeammate) {
            // Pass the ball
            gameState.ball.vx = (nearestTeammate.x - player.x) * 0.2;
            gameState.ball.vy = (nearestTeammate.y - player.y) * 0.2;
            player.hasBall = false;
        }
        
        input.keys.p = false;
    }
    
    // Shooting is handled by keyboard events and power shot functions
}

function updateBall() {
    const ball = gameState.ball;
    
    if (!gameState.player.hasBall) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Ball friction
        ball.vx *= 0.98;
        ball.vy *= 0.98;
        
        // Check if ball goes in goal
        if (ball.x >= gameState.goal.x && 
            ball.x <= gameState.goal.x + gameState.goal.width &&
            ball.y >= gameState.goal.y && 
            ball.y <= gameState.goal.y + gameState.goal.height) {
            
            // Goal scored!
            gameState.score.home++;
            resetPlay();
        }
        
        // Ball boundaries
        if (ball.x < 0 || ball.x > canvas.width || ball.y < 0 || ball.y > canvas.height) {
            resetPlay();
        }
        
        // Check if player can pick up ball
        const distance = Math.sqrt(
            Math.pow(ball.x - gameState.player.x, 2) + 
            Math.pow(ball.y - gameState.player.y, 2)
        );
        
        if (distance < 25 && Math.abs(ball.vx) < 1 && Math.abs(ball.vy) < 1) {
            gameState.player.hasBall = true;
            ball.vx = 0;
            ball.vy = 0;
        }
    }
}

function updateAI() {
    // Simple AI for opponents - move toward player
    gameState.opponents.forEach(opponent => {
        const dx = gameState.player.x - opponent.x;
        const dy = gameState.player.y - opponent.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 30) {
            opponent.vx = (dx / distance) * 1.5;
            opponent.vy = (dy / distance) * 1.5;
        } else {
            opponent.vx *= 0.5;
            opponent.vy *= 0.5;
        }
        
        opponent.x += opponent.vx;
        opponent.y += opponent.vy;
        
        // Keep opponents on field
        opponent.x = Math.max(20, Math.min(canvas.width - 20, opponent.x));
        opponent.y = Math.max(20, Math.min(canvas.height - 20, opponent.y));
    });
    
    // Simple AI for teammates - spread out and get open
    gameState.teammates.forEach((teammate, index) => {
        const targetY = (canvas.height / 4) * (index + 1);
        const targetX = gameState.player.x + 100 + (index * 50);
        
        const dx = targetX - teammate.x;
        const dy = targetY - teammate.y;
        
        teammate.vx = dx * 0.02;
        teammate.vy = dy * 0.02;
        
        teammate.x += teammate.vx;
        teammate.y += teammate.vy;
        
        // Keep teammates on field
        teammate.x = Math.max(20, Math.min(canvas.width - 100, teammate.x));
        teammate.y = Math.max(20, Math.min(canvas.height - 20, teammate.y));
    });
}

function updatePowerMeter() {
    if (gameState.powerCharging) {
        gameState.powerLevel = Math.min(1, gameState.powerLevel + 0.02);
        const powerFill = document.getElementById('powerFill');
        powerFill.style.height = `${gameState.powerLevel * 100}%`;
    }
}

function resetPlay() {
    gameState.player.x = 150;
    gameState.player.y = canvas.height / 2;
    gameState.player.hasBall = true;
    gameState.ball.x = gameState.player.x + 15;
    gameState.ball.y = gameState.player.y;
    gameState.ball.vx = 0;
    gameState.ball.vy = 0;
    gameState.shotClock = 30;
    gameState.shotClockActive = false;
}

// Rendering
function render() {
    // Clear canvas
    ctx.fillStyle = '#4a7c59';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw field lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    // Draw goal
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 4;
    ctx.strokeRect(gameState.goal.x, gameState.goal.y, gameState.goal.width, gameState.goal.height);
    
    // Draw goal net
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const x = gameState.goal.x + (i * gameState.goal.width / 4);
        ctx.beginPath();
        ctx.moveTo(x, gameState.goal.y);
        ctx.lineTo(x, gameState.goal.y + gameState.goal.height);
        ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
        const y = gameState.goal.y + (i * gameState.goal.height / 6);
        ctx.beginPath();
        ctx.moveTo(gameState.goal.x, y);
        ctx.lineTo(gameState.goal.x + gameState.goal.width, y);
        ctx.stroke();
    }
    
    // Draw players
    function drawPlayer(x, y, color, hasBall = false) {
        ctx.fillStyle = color;
        ctx.fillRect(x - 8, y - 8, 16, 16);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 8, y - 8, 16, 16);
        
        if (hasBall) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + 12, y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
    
    // Draw player
    drawPlayer(gameState.player.x, gameState.player.y, '#0066cc', gameState.player.hasBall);
    
    // Draw teammates
    gameState.teammates.forEach(teammate => {
        drawPlayer(teammate.x, teammate.y, '#0099ff');
    });
    
    // Draw opponents
    gameState.opponents.forEach(opponent => {
        drawPlayer(opponent.x, opponent.y, '#cc0000');
    });
    
    // Draw ball if not with player
    if (!gameState.player.hasBall) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(gameState.ball.x, gameState.ball.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function updateUI() {
    document.getElementById('score').textContent = 
        `HOME ${gameState.score.home} - ${gameState.score.away} AWAY`;
    
    document.getElementById('stamina').textContent = 
        `STAMINA: ${Math.round(gameState.player.stamina)}%`;
    
    if (gameState.shotClockActive) {
        document.getElementById('shotClock').style.display = 'block';
        document.getElementById('shotClock').textContent = 
            `SHOT CLOCK: ${Math.ceil(gameState.shotClock)}`;
    } else {
        document.getElementById('shotClock').style.display = 'none';
    }
}

// Main game loop
function gameLoop() {
    if (!gameState.gameRunning) return;
    
    updatePlayer();
    handleActions();
    updateBall();
    updateAI();
    updatePowerMeter();
    render();
    updateUI();
    
    requestAnimationFrame(gameLoop);
}

function startGame() {
    document.getElementById('instructions').style.display = 'none';
    gameState.gameRunning = true;
    initGame();
    resetPlay();
    gameLoop();
}

// Show instructions on load
document.getElementById('instructions').style.display = 'block';

// Prevent context menu on mobile
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());
