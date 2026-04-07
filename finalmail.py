import resend

# ==========================================
# RÉGLAGES
# ==========================================
ENVOYER_CONTRAT = True
resend.api_key = "re_CWQMFExQ_KXet6CcKxzkCGQ9vnzNPEL7V"
DESTINATAIRE   = "leriz3301@gmail.com"

# ==========================================
# DONNÉES (SANS LES {{ }})
# ==========================================
data = {
    "amount":           "250,00 $",
    "initiated_date":   "March 31, 2026",
    "contract_number":  "CTR-2026-0042",
    "project_id":       "PRJ-8293",
    "deadline":         "April 7, 2026",
    "project_name":     "YouTube Video Edit",
    "client_name":      "Gabriel Marchand",
    "editor_name":      "Henri Bolduc",
    "description":      "Short-form video edit",
    "duration":         "5 days",
    "agreement_url":    "https://coredon.app/contracts/CTR-2026-0042/agreement",
    "details_url":      "https://coredon.app/contracts/CTR-2026-0042",
    "payment_url":      "https://coredon.app/pay/PRJ-8293",
}

def envoyer_mail_final():
    try:
        with open("contract.html", "r", encoding="utf-8") as f:
            html = f.read()

        # BOUCLE ROBUSTE : Remplace {{var}}, {{ var }} et {{  var  }}
        for key, value in data.items():
            # Teste plusieurs formats pour être sûr de trouver le texte dans le HTML
            html = html.replace("{{" + key + "}}", str(value))
            html = html.replace("{{ " + key + " }}", str(value))
            html = html.replace("{{  " + key + "  }}", str(value))

        params = {
            "from": "Coredon <contracts@coredon.app>",
            "to": [DESTINATAIRE],
            "subject": "Nouveau contrat Coredon",
            "html": html,
        }

        resend.Emails.send(params)
        print("Email envoyé ! Vérifie si les variables sont remplacées cette fois.")

    except Exception as e:
        print(f"Erreur : {e}")

envoyer_mail_final()