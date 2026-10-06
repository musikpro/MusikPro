import UIKit
import Capacitor

/// Contrôleur principal de l'application : active le geste de retour par balayage depuis le bord gauche
/// (comportement attendu sur iPhone). Capacitor ne l'active pas : sans lui, un balayage ne fait rien.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        webView?.allowsBackForwardNavigationGestures = true
    }
}
