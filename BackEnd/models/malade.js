const express = require('express') ; 
const mongoose = require('mongoose') ; 


const schema = mongoose.Schema ;  



const MaladeSchema = new schema({

    nom : {
           type: String 

    } , 
    prenom: {
        type: String ,

 } , 

    dateNaissance: {
        type: String
       
    }
    
 
}, {timestamps: true});

const Malade = mongoose.model('Malade', MaladeSchema);

module.exports = Malade  ; 

