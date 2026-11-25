//
//  QuestionViewController.swift
//  personaliityQiuz
//
//  Quiz question flow: single choice, multiple choice, and ranged answers.
//

import UIKit

class QuestionViewController: UIViewController {

    @IBOutlet weak var singleStackView: UIStackView!
    @IBOutlet weak var singleButton1: UIButton!
    @IBOutlet weak var singleButton2: UIButton!
    @IBOutlet weak var singleButton3: UIButton!
    @IBOutlet weak var singleButton4: UIButton!

    @IBOutlet weak var multipleStackView: UIStackView!
    @IBOutlet weak var multipleoption1: UILabel!
    @IBOutlet weak var multipleoption2: UILabel!
    @IBOutlet weak var multipleoption3: UILabel!
    @IBOutlet weak var multipleoption4: UILabel!
    @IBOutlet weak var multiSwitch1: UISwitch!
    @IBOutlet weak var multiSwitch2: UISwitch!
    @IBOutlet weak var multiSwitch3: UISwitch!
    @IBOutlet weak var multiSwitch4: UISwitch!

    @IBOutlet weak var rangedStackView: UIStackView!
    @IBOutlet weak var rangedOption1: UILabel!
    @IBOutlet weak var rangedoption2: UILabel!
    @IBOutlet weak var rangedSlider: UISlider!

    @IBOutlet weak var questionLable: UILabel!
    @IBOutlet weak var questionProgressView: UIProgressView!

    var questions: [Questions] = [
        Questions(
            text: "1. How do you usually spend your free time?",
            answers: [
                Answer(text: "A. Going out with friends", type: .personality1),
                Answer(text: "B. Watching movies or listening to music", type: .personality2),
                Answer(text: "C. Reading or learning something new", type: .personality3),
                Answer(text: "D. Sleeping or relaxing alone", type: .personality4)
            ],
            type: .single
        ),
        Questions(
            text: "2. What do you do when someone hurts you?",
            answers: [
                Answer(text: "Option 1", type: .personality1),
                Answer(text: "Option 2", type: .personality2),
                Answer(text: "Option 3", type: .personality3),
                Answer(text: "Option 4", type: .personality4)
            ],
            type: .multiple
        ),
        Questions(
            text: "3. What's your biggest strength?",
            answers: [
                Answer(text: "Option 1", type: .personality1),
                Answer(text: "Option 2", type: .personality2),
                Answer(text: "Option 3", type: .personality3),
                Answer(text: "Option 4", type: .personality4)
            ],
            type: .ranged
        )
    ]

    private var questionindex = 0
    private var answerChoosen: [Answer] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        updateUI()
    }

    @IBAction func SingleAnswerButtonPressed(_ sender: UIButton) {
        guard questionindex < questions.count else { return }
        let answers = questions[questionindex].answers

        switch sender {
        case singleButton1: answerChoosen.append(answers[0])
        case singleButton2: answerChoosen.append(answers[1])
        case singleButton3: answerChoosen.append(answers[2])
        case singleButton4: answerChoosen.append(answers[3])
        default: return
        }
        nextQuestion()
    }

    @IBAction func multipleAnswerButtonPressed(_ sender: UIButton) {
        guard questionindex < questions.count else { return }
        let answers = questions[questionindex].answers
        let selectedSwitches: [(UISwitch, Int)] = [
            (multiSwitch1, 0), (multiSwitch2, 1),
            (multiSwitch3, 2), (multiSwitch4, 3)
        ]

        let selectedAnswers = selectedSwitches.compactMap { item -> Answer? in
            item.0.isOn && item.1 < answers.count ? answers[item.1] : nil
        }

        guard !selectedAnswers.isEmpty else {
            let alert = UIAlertController(
                title: "Select an answer",
                message: "Please select at least one option before continuing.",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            return
        }

        answerChoosen.append(contentsOf: selectedAnswers)
        nextQuestion()
    }

    @IBAction func rangedAnswerButtonPresses() {
        guard questionindex < questions.count else { return }
        let answers = questions[questionindex].answers
        guard !answers.isEmpty else { return }

        let value = min(max(rangedSlider.value, 0), 1)
        let index = Int(round(value * Float(answers.count - 1)))
        answerChoosen.append(answers[index])
        nextQuestion()
    }

    @IBSegueAction func showResults(_ coder: NSCoder) -> ResultViewController? {
        ResultViewController(coder: coder, responses: answerChoosen)
    }

    private func updateUI() {
        guard questionindex < questions.count else { return }

        singleStackView.isHidden = true
        multipleStackView.isHidden = true
        rangedStackView.isHidden = true

        navigationItem.title = "Question #\(questionindex + 1)"
        let currentQuestion = questions[questionindex]
        let answers = currentQuestion.answers
        let progress = Float(questionindex) / Float(max(questions.count, 1))

        questionLable.text = currentQuestion.text
        questionProgressView.setProgress(progress, animated: true)

        switch currentQuestion.type {
        case .single:
            updateSingleStack(using: answers)
        case .multiple:
            updateMultipleStackView(using: answers)
        case .ranged:
            updateRangedStackView(using: answers)
        }
    }

    private func updateSingleStack(using answers: [Answer]) {
        guard answers.count >= 4 else { return }
        singleStackView.isHidden = false
        singleButton1.setTitle(answers[0].text, for: .normal)
        singleButton2.setTitle(answers[1].text, for: .normal)
        singleButton3.setTitle(answers[2].text, for: .normal)
        singleButton4.setTitle(answers[3].text, for: .normal)
    }

    private func updateMultipleStackView(using answers: [Answer]) {
        guard answers.count >= 4 else { return }
        multipleStackView.isHidden = false
        multipleoption1.text = answers[0].text
        multipleoption2.text = answers[1].text
        multipleoption3.text = answers[2].text
        multipleoption4.text = answers[3].text

        // Each question starts with all choices unselected.
        [multiSwitch1, multiSwitch2, multiSwitch3, multiSwitch4].forEach {
            $0?.setOn(false, animated: false)
        }
    }

    private func updateRangedStackView(using answers: [Answer]) {
        guard !answers.isEmpty else { return }
        rangedStackView.isHidden = false
        rangedOption1.text = answers.first?.text
        rangedoption2.text = answers.last?.text
        rangedSlider.setValue(0.5, animated: false)
    }

    private func nextQuestion() {
        questionindex += 1

        if questionindex < questions.count {
            updateUI()
        } else {
            questionProgressView.setProgress(1.0, animated: true)
            performSegue(withIdentifier: "Results", sender: nil)
        }
    }
}
