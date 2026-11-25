//
//  Questions.swift
//  personaliityQiuz
//
//  Created by Puneet Kumar on 28/10/26.
//

import Foundation

struct Questions{
    
    var text : String
    var answers : [Answer]
    var type : responseType
    
    enum responseType{
        case single , multiple , ranged
    }
    
}


struct Answer {
    var text : String
    var type : personalityType
}
    enum personalityType:Character {
        case personality1 = "☺️"
        case personality2 = "😴"
        case personality3 = "😊"
        case personality4 = "😌"
        
        
        var defination : String {
            switch self {
            case .personality1:
                return "Optimistic"
            case .personality2:
                return "Shy"
            case .personality3:
                return "Energetic"
            case .personality4:
                return "Calm"
            }
        }
    
    
    
}
