//
//  ViewController.swift
//  demo
//
//  Created by Nishkarsh on 21/10/26.
//

import UIKit

class ViewController: UIViewController {
    @IBOutlet weak var pretty: UILabel!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
    }

    @IBAction func buttontolabel(_ sender: Any) {
        pretty.text = "hello ji"
    }
    
    @IBAction func slider(_ sender: Any) {
        if let slider = sender as? UISlider {
            print(slider.value)
            
        }
    }
    @IBAction func sisi(_ sender: Any) {
        if (sender as AnyObject).isOn {
        self.view.backgroundColor = .systemOrange
        } else {
            self.view.backgroundColor = .white
        }
        
        
    }
    @IBAction func faikittextfield(_ sender: Any) {
    }
}

