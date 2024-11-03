class GameMode {
    // Base class with common functionality
    constructor(gameRef) {
        this.gameRef = gameRef;
        this.timeLimit = 20; // seconds per question
    }

    calculateTimeBonus(timeLeft) {
        return Math.floor((timeLeft / this.timeLimit) * 500);
    }
}

class SpeedDuel extends GameMode {
    constructor(gameRef) {
        super(gameRef);
        this.baseScore = 500;
    }

    calculateScore(timeToAnswer, isCorrect) {
        if (!isCorrect) return 0;
        const timeBonus = this.calculateTimeBonus(this.timeLimit - timeToAnswer);
        return this.baseScore + timeBonus;
    }

    async handleAnswer(playerId, answer, timeToAnswer) {
        const isCorrect = await this.checkAnswer(answer);
        const score = this.calculateScore(timeToAnswer, isCorrect);
        
        await this.gameRef.collection('players').doc(playerId).update({
            score: firebase.firestore.FieldValue.increment(score),
            lastAnswer: {
                answer,
                isCorrect,
                timeToAnswer,
                score
            }
        });

        return { isCorrect, score };
    }
}

class KnowledgeLadder extends GameMode {
    constructor(gameRef) {
        super(gameRef);
        this.levelMultiplier = 100;
    }

    calculateScore(currentLevel, isCorrect) {
        if (!isCorrect) return Math.max(0, currentLevel - 1);
        return currentLevel + 1;
    }

    async handleAnswer(playerId, answer, currentLevel) {
        const isCorrect = await this.checkAnswer(answer);
        const newLevel = this.calculateScore(currentLevel, isCorrect);
        const score = newLevel * this.levelMultiplier;

        await this.gameRef.collection('players').doc(playerId).update({
            level: newLevel,
            score: score,
            lastAnswer: {
                answer,
                isCorrect,
                newLevel,
                score
            }
        });

        return { isCorrect, newLevel, score };
    }
}

class TeamBattle extends GameMode {
    constructor(gameRef) {
        super(gameRef);
        this.teamScoreMultiplier = 100;
    }

    calculateTeamScore(teamAnswers) {
        return teamAnswers.reduce((total, answer) => {
            return total + (answer.isCorrect ? this.teamScoreMultiplier : 0);
        }, 0);
    }

    async handleAnswer(playerId, answer, teamId) {
        const isCorrect = await this.checkAnswer(answer);
        
        // Update player's answer
        await this.gameRef.collection('players').doc(playerId).update({
            lastAnswer: {
                answer,
                isCorrect,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        });

        // Update team score
        const teamRef = this.gameRef.collection('teams').doc(teamId);
        await teamRef.update({
            score: firebase.firestore.FieldValue.increment(
                isCorrect ? this.teamScoreMultiplier : 0
            ),
            answers: firebase.firestore.FieldValue.arrayUnion({
                playerId,
                isCorrect,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
        });

        return { isCorrect };
    }

    async checkAnswer(answer) {
        // This would check against the correct answer in the database
        // For now, returning a placeholder
        return true;
    }
}

export { SpeedDuel, KnowledgeLadder, TeamBattle }; 