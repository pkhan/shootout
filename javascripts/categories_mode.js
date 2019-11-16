var app = {};
app.Models = {};
app.Collections = {};
app.Views = {};

app.dispatcher = new Flux.Dispatcher();

var enums = {};
enums.players = {
    PLAYER1: 0,
    PLAYER2: 1
};
enums.questionStates = {
    UNCLAIMED: 'unclaimed',
    ANSWERED: 'answered',
    WRONG: 'wrong',
    UNANSWERED: 'unanswered',
    STOLEN: 'stolen'
};
enums.gameStates = {
    ACTIVE: 'active',
    OVER: 'over'
};

function CategoryScorer(state) {
    if(!state) {
        state = CategoryScorer.blankState();
    }
    this.state = state;
}
_.extend(CategoryScorer, {
    blankState: function() {
        state = {
            currentCategoryNum: 1,
            categories: [],
            players: [{
                id: enums.players.PLAYER1,
                name: "",
                score: 0
            },
            {
                id: enums.players.PLAYER2,
                name: "",
                score: 0 
            }],
            winScore: 10,
            questionsPerCategory: 5,
            gameState: enums.gameStates.ACTIVE
        };
        state.currentCategory = this.generateBlankCategory(state.questionsPerCategory);
        state.currentQuestion = state.currentCategory.questions[0];
        state.categories.push(state.currentCategory);
    
        return state;
    },
    generateBlankCategory: function(numQuestions) {
        var questions = [];
        for(var i = 0; i < numQuestions; i++) {
            var status = enums.questionStates.UNCLAIMED;
            if(i === 0) {
                status = enums.questionStates.UNANSWERED;
            }
            questions.push({
                id: i,
                state: status,
                answeredBy: null,
                claimed: false
            });
        }
        return {
            questions: questions,
            owner: null
        };
    },
});

_.extend(CategoryScorer.prototype, {
    generateBlankCategory: function(numQuestions) {
        return CategoryScorer.generateBlankCategory(numQuestions);
    },
    nextCategory: function() {
        this.bankPoints();
        if(this.state.gameState === enums.gameStates.ACTIVE) {
            this.state.currentCategoryNum = this.state.currentCategoryNum + 1;
            this.state.currentCategory = this.generateBlankCategory(this.state.questionsPerCategory);
            this.state.categories.push(this.state.currentCategory);
            this.nextQuestion();
        }
    },
    currentCategoryPoints: function() {
        var points = 0;
        for(var i = 0; i < this.state.currentCategory.questions.length; i++) {
            var question = this.state.currentCategory.questions[i];
            if(question.state === enums.questionStates.ANSWERED || question.state === enums.questionStates.STOLEN) {
                points++;
            }
        }
        return points;
    },
    currentCategoryOwner: function() {
        var lastQuestion = this.lastAnsweredQuestion();
        if(lastQuestion) {
            return lastQuestion.answeredBy;
        } 
        return null;
    },
    lastAnsweredQuestion: function() {
        var lastQuestion = null;
        for(var i = 0; i < this.state.currentCategory.questions.length; i++) {
            var question = this.state.currentCategory.questions[i];
            if(question.state === enums.questionStates.ANSWERED || question.state === enums.questionStates.STOLEN) {
                lastQuestion = question;
            }
        }
        return lastQuestion;
    },
    bankPoints: function() {
        var owner = this.currentCategoryOwner();
        var points = this.currentCategoryPoints();
        if(owner !== null) {
            this.state.players[owner].score += points;
        }
        this.calculateWin();
    },
    answerQuestion: function(playerId) {
        var question = this.state.currentQuestion;
        if(question.state === enums.questionStates.UNANSWERED) {
            question.state = enums.questionStates.ANSWERED;
        } else if(question.state === enums.questionStates.WRONG) {
            question.state = enums.questionStates.STOLEN;
        }
        question.answeredBy = playerId;
        this.state.currentCategory.owner = playerId;
        if(question.id === this.state.questionsPerCategory - 1) {
            this.nextCategory();
        } else {
            this.nextQuestion();
        }
    },
    claimQuestion: function() {
        var question = this.state.currentQuestion;
        if(question.state !== enums.questionStates.UNCLAIMED) {
            return;
        }
        question.state = enums.questionStates.UNANSWERED;
    },
    answerWrong: function(playerId) {
        var question = this.state.currentQuestion;
        if(question.state === enums.questionStates.WRONG) {
            return this.nextCategory();
        }
        question.state = enums.questionStates.WRONG;
        question.answeredBy = playerId;
    },
    nextQuestion: function() {
        var lastQuestion = this.lastAnsweredQuestion();
        var questionIndex = 0;
        if(lastQuestion) {
            questionIndex = lastQuestion.id + 1;
        }
        this.state.currentQuestion = this.state.currentCategory.questions[questionIndex];
        return this.state.currentQuestion;
    },
    calculateWin: function() {
        if(this.state.players[enums.players.PLAYER1].score >= 10) {
            this.state.gameState = enums.gameStates.OVER;
        }
        if(this.state.players[enums.players.PLAYER2].score >= 10) {
            this.state.gameState = enums.gameStates.OVER;
        }
    },
    winningPlayer: function() {
        if(this.state.players[enums.players.PLAYER1].score > this.state.players[enums.players.PLAYER2].score) {
            return this.state.players[enums.players.PLAYER1];
        }
        return this.state.players[enums.players.PLAYER2];
    },
    openCategory: function() {
        return this.nextQuestion().id === 0;
    }

});
