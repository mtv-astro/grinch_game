document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    document.body.appendChild(canvas);

    const TILE_SIZE = 80;
    const SPRITE_SIZE = 90;
    const TREE_SIZE = 140;

    const GIFT_SIZE = {
        pink: 70,
        red: 40,
        green: 60,
        purple: 40,
        blue: 55,
    };

    const assets = {
        background: "landscape.png",
        grinch: "grinch.png",
        tree: "tree.png",
        gifts: {
            pink: "gift_pink.png",
            red: "gift_red.png",
            green: "gift_green.png",
            purple: "gift_purple.png",
            blue: "gift_blue.png",
        },
    };

    const loadImage = (src) =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(`Failed to load image: ${src}`);
            img.src = src;
        });

    const resizeCanvas = (bgImage) => {
        const scale = Math.min(window.innerWidth / bgImage.width, window.innerHeight / bgImage.height);
        canvas.width = bgImage.width * scale;
        canvas.height = bgImage.height * scale;
    };

    const generateGiftCounts = (totalTrees) => {
        const giftCounts = [];
        const percentages = { 5: 0.1, 4: 0.15, 3: 0.2, 2: 0.25, 1: 0.3 };
        for (const [count, percentage] of Object.entries(percentages)) {
            const numTrees = Math.floor(totalTrees * percentage);
            for (let i = 0; i < numTrees; i++) {
                giftCounts.push(parseInt(count));
            }
        }
        while (giftCounts.length < totalTrees) giftCounts.push(1);
        while (giftCounts.length > totalTrees) giftCounts.pop();
        return giftCounts.sort(() => Math.random() - 0.5);
    };

    const selectRandomTrees = (trees, count) => {
        const shuffled = trees.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    };

    const startGame = async () => {
        try {
            const background = await loadImage(assets.background);
            const grinch = await loadImage(assets.grinch);
            const treeImage = await loadImage(assets.tree);

            const gifts = {};
            for (const [color, src] of Object.entries(assets.gifts)) {
                gifts[color] = await loadImage(src);
            }

            resizeCanvas(background);

            const treePositions = [
                { x: 55, y: 100 },
                { x: 55, y: 230 },
                { x: 55, y: 350 },
                { x: 130, y: 170 },
                { x: 55, y: 480 },
                { x: 255, y: 70 },
                { x: 320, y: 170 },
                { x: 255, y: 250 },
                { x: 325, y: 340 },
                { x: 300, y: 470 },
            ];

            const leftTrees = treePositions.filter(pos => pos.x < 150);
            const rightTrees = treePositions.filter(pos => pos.x >= 150);

            const selectedLeftTrees = selectRandomTrees(leftTrees, 3);
            const selectedRightTrees = selectRandomTrees(rightTrees, 3);

            const selectedTrees = [...selectedLeftTrees, ...selectedRightTrees];

            const giftPositionsRelative = [
                { x: -30, y: 30 },
                { x: 0, y: 40 },
                { x: 30, y: 30 },
                { x: -15, y: 60 },
                { x: 15, y: 60 },
            ];

            const giftCounts = generateGiftCounts(selectedTrees.length);
            const trees = selectedTrees.map((treePos, index) => {
                const numGifts = giftCounts[index];
                const giftsForTree = [];
                const giftColors = Object.keys(GIFT_SIZE);

                for (let i = 0; i < numGifts; i++) {
                    const color = giftColors[i % giftColors.length];
                    const size = GIFT_SIZE[color];
                    const relativePos = giftPositionsRelative[i % giftPositionsRelative.length];
                    giftsForTree.push({
                        x: treePos.x + relativePos.x,
                        y: treePos.y + relativePos.y,
                        color,
                        size,
                        points: 50, // Presente vale 50 pontos no total
                        counter: 0,
                    });
                }

                return { ...treePos, gifts: giftsForTree, respawnTimer: 0 };
            });

            let grinchPos = { x: canvas.width / 2, y: canvas.height / 2 };
            let grinchTarget = { ...grinchPos };
            let score = 0;

            const moveTowardsTarget = (pos, target, speed) => {
                const dx = target.x - pos.x;
                const dy = target.y - pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < speed) {
                    return { ...target };
                }
                return {
                    x: pos.x + (dx / distance) * speed,
                    y: pos.y + (dy / distance) * speed,
                };
            };

            const loop = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

                trees.forEach((tree) => {
                    if (tree.respawnTimer > 0) {
                        tree.respawnTimer -= 1 / 60;
                        if (tree.respawnTimer <= 0) {
                            tree.gifts.forEach(gift => {
                                gift.points = 50; // Resetar pontos do presente
                            });
                        }
                    }

                    ctx.drawImage(treeImage, tree.x - TREE_SIZE / 2, tree.y - TREE_SIZE / 2, TREE_SIZE, TREE_SIZE);
                    tree.gifts.forEach((gift) => {
                        const giftImg = gifts[gift.color];
                        if (giftImg && gift.points > 0) {
                            ctx.drawImage(
                                giftImg,
                                gift.x - gift.size / 2,
                                gift.y - gift.size / 2,
                                gift.size,
                                gift.size
                            );
                        }
                    });
                });

                trees.forEach((tree) => {
                    if (
                        Math.abs(grinchPos.x - tree.x) < TREE_SIZE / 2 &&
                        Math.abs(grinchPos.y - tree.y) < TREE_SIZE / 2
                    ) {
                        let allGiftsGone = true;
                        tree.gifts.forEach((gift) => {
                            if (gift.points > 0) {
                                allGiftsGone = false;
                                gift.counter += 1 / 60;
                                if (gift.counter >= 2) {
                                    score += 1;
                                    gift.points -= 1;
                                    gift.counter = 0;
                                }
                            }
                        });

                        if (allGiftsGone && tree.respawnTimer <= 0) {
                            tree.respawnTimer = 90; // 1 minuto e meio
                        }
                    }
                });

                grinchPos = moveTowardsTarget(grinchPos, grinchTarget, 5);
                ctx.drawImage(
                    grinch,
                    grinchPos.x - SPRITE_SIZE / 2,
                    grinchPos.y - SPRITE_SIZE / 2,
                    SPRITE_SIZE,
                    SPRITE_SIZE
                );

                ctx.font = "24px 'Press Start 2P'";
                ctx.fillStyle = "black";
                ctx.fillText(`Score: ${score}`, 10, 30);

                requestAnimationFrame(loop);
            };

            canvas.addEventListener("mousedown", (event) => {
                grinchTarget = { x: event.offsetX, y: event.offsetY };
            });

            loop();
        } catch (error) {
            console.error("Erro ao carregar os recursos do jogo:", error);
        }
    };

    startGame();
});
