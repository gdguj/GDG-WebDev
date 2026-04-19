const mongoose = require('mongoose');

const gameTemplateSchema = new mongoose.Schema({
  title: String,      
  gameType: String,  
  description: String,
  data: {
    grid: Array,     
    questions: [      
      {
        letter: String,
        question: String,
        answer: String
      }
    ]
  },
  isCustom: Boolean,
  createdBy: String
});

module.exports = mongoose.model('GameTemplate', gameTemplateSchema,'gameTemplates');