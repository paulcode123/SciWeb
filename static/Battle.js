startLoading();
import { Intro } from './games/minesweeper/minesweeper.js';
import { MineSweeper } from './games/minesweeper/minesweeper.js';

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: 0x2d2d2d,
    parent: 'game-container',
    scene: [ Intro, MineSweeper ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

// Initialize the game when battle starts
async function startBattle(battleData) {
    try {
         // Show loading animation

        // Get questions using the battle data
        const questions = await getQuestionsForUnit(battleData.class, battleData.unit);
        
        const battleGame = new Phaser.Game(config);

        // Wait for the scene to be created and ready
        battleGame.events.once('ready', () => {
            const battleScene = battleGame.scene.getScene('BattleScene');
            if (battleScene) {
                battleScene.initBattle({
                    unit: {
                        id: `${battleData.class}-${battleData.unit}`,
                        className: battleData.class,
                        unitName: battleData.unit
                    },
                    questions: questions,
                    gameMode: battleData.gameMode
                });
            }
        });

        endLoading(); // Hide loading animation
    } catch (error) {
        console.error('Error starting battle:', error);
        endLoading();
    }
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    const pathSegments = window.location.pathname.split('/');
    const battleId = pathSegments[pathSegments.length - 1];

    if (!battleId) {
        console.error('No battle ID provided');
        return;
    }

    try {
        // Fetch battle data from the Battles sheet
        var battleData = await fetchRequest('/data', {
            data: 'Battles'
        });
        console.log(battleData);
        // filter for the battle with the given id
        battleData = battleData['Battles'].filter(item => parseInt(item.id) == parseInt(battleId))[0];
        console.log(battleData);
        if (!battleData) {
            console.error('Battle not found');
            return;
        }

        await startBattle(battleData);
    } catch (error) {
        console.error('Error fetching battle data:', error);
    }
});

// Updated to use fetchRequest from util.js
async function getQuestionsForUnit(classId, unitName) {
    try {
        const data = await fetchRequest('/generate-questions', {
            classId: classId,
            unitName: unitName,
            mcqCount: 5,
            writtenCount: 0
        });
        
        // Transform the response to match the format expected by QuestionSystem
        return data.questions.multiple_choice.map(q => ({
            question: q.question,
            answers: q.answers,
            correct: q.answers.indexOf(q.correct_answer)
        }));
    } catch (error) {
        console.error('Error fetching questions:', error);
        return [];
    }
}