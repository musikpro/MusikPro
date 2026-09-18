# 08 — Uploads / R2

- Bucket privé par défaut.
- Taille maximale par type de fichier.
- Vérifie MIME et extension; ne fais pas confiance au nom fourni par l'utilisateur.
- Génère les noms/identifiants côté serveur.
- Utilise des URL signées à durée courte pour les fichiers privés.
- Pour les formats risqués, ajoute une analyse antivirus/malware avant exposition.
