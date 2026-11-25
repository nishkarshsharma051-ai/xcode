//
//  ResultViewController.swift
//  personaliityQiuz
//

import UIKit

class ResultViewController: UIViewController {
    @IBOutlet weak var resultLable: UILabel!
    @IBOutlet weak var resultDefinationLable: UILabel!

    private var responses: [Answer]

    init?(coder: NSCoder, responses: [Answer]) {
        self.responses = responses
        super.init(coder: coder)
    }

    required init?(coder: NSCoder) {
        fatalError("Use init(coder:responses:) to create ResultViewController.")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        navigationItem.hidesBackButton = true
        calculatePersonalityResult()
    }

    private func calculatePersonalityResult() {
        let counts = responses.reduce(into: [personalityType: Int]()) { result, answer in
            result[answer.type, default: 0] += 1
        }

        guard let mostCommon = counts.max(by: { $0.value < $1.value })?.key else {
            resultLable.text = "No result available"
            resultDefinationLable.text = "Please complete the quiz and try again."
            return
        }

        resultLable.text = "You are a \(mostCommon.rawValue)!"
        resultDefinationLable.text = mostCommon.defination
    }
}
