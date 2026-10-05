class GradientReversalFunction(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x, lambd):
        ctx.lambd = lambd
        return x.view_as(x)

    @staticmethod
    def backward(ctx, grad_output):
        return -ctx.lambd * grad_output, None


class GradientReversalLayer(nn.Module):
    def __init__(self):
        super().__init__()
        self.lambd = 1.0

    def set_lambda(self, lambd):
        self.lambd = lambd

    def forward(self, x):
        return GradientReversalFunction.apply(x, self.lambd)


class ProposedTransformNet(nn.Module):
    def __init__(self, in_dim=512, hidden_dim=512, out_dim=512):
        super().__init__()
        self.fc1 = nn.Linear(in_dim, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.act = nn.LeakyReLU(0.1)
        self.drop = nn.Dropout(0.2)
        self.fc2 = nn.Linear(hidden_dim, out_dim)
        self.bn2 = nn.BatchNorm1d(out_dim)
        self.alpha = nn.Parameter(torch.tensor(0.30))

    def forward(self, x):
        h = self.drop(self.act(self.bn1(self.fc1(x))))
        res = self.bn2(self.fc2(h))
        t = x + torch.clamp(self.alpha, 0.10, 0.50) * res
        return F.normalize(t, p=2, dim=1)


class ArcMarginProduct(nn.Module):
    def __init__(self, in_features, out_features, s=28.0, m=0.25):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.s = s
        self.m = m
        self.weight = nn.Parameter(torch.FloatTensor(out_features, in_features))
        nn.init.xavier_uniform_(self.weight)
        self.cos_m = np.cos(m)
        self.sin_m = np.sin(m)
        self.th = np.cos(np.pi - m)
        self.mm = np.sin(np.pi - m) * m

    def forward(self, input, label):
        cosine = F.linear(F.normalize(input), F.normalize(self.weight))
        sine = torch.sqrt(1.0 - torch.pow(cosine, 2)).clamp(0, 1)
        phi = cosine * self.cos_m - sine * self.sin_m
        phi = torch.where(cosine > self.th, phi, cosine - self.mm)
        one_hot = torch.zeros(cosine.size(), device=input.device)
        one_hot.scatter_(1, label.view(-1, 1).long(), 1)
        output = (one_hot * phi) + ((1.0 - one_hot) * cosine)
        output *= self.s
        return output


class EnsembleAttributeAdversaryHead(nn.Module):
    def __init__(self, in_dim, n_classes):
        super().__init__()
        self.grl = GradientReversalLayer()
        self.head1 = nn.Sequential(nn.Linear(in_dim, 64), nn.ReLU(), nn.Linear(64, n_classes))
        self.head2 = nn.Sequential(nn.Linear(in_dim, 128), nn.LeakyReLU(0.1), nn.Linear(128, n_classes))

    def set_lambda(self, lambd):
        self.grl.set_lambda(lambd)

    def forward(self, x):
        reversed_x = self.grl(x)
        return self.head1(reversed_x), self.head2(reversed_x)


def compute_decorrelation_loss(templates, targets, n_classes=2):
    centered_t = templates - templates.mean(dim=0, keepdim=True)
    if n_classes > 2:
        one_hot = F.one_hot(targets, num_classes=n_classes).float()
        centered_y = one_hot - one_hot.mean(dim=0, keepdim=True)
    else:
        targets_float = (targets.float().unsqueeze(1) if targets.ndim == 1 else targets.float())
        centered_y = targets_float - targets_float.mean(dim=0, keepdim=True)
    cov = torch.matmul(centered_t.T, centered_y) / (templates.size(0) - 1 + 1e-8)
    return torch.mean(cov**2)


def sample_random_triplets(embeddings, identities, batch_size, seed):
    generator = np.random.default_rng(seed)
    id_to_indices = {}
    for idx, identity in enumerate(identities):
        id_to_indices.setdefault(identity, []).append(idx)
    valid_ids = [i for i, idxs in id_to_indices.items() if len(idxs) >= 2]
    anchors, positives, negatives = [], [], []
    selected_ids = generator.choice(valid_ids, size=min(batch_size, len(valid_ids)), replace=False)
    for anchor_id in selected_ids:
        a_idx, p_idx = generator.choice(id_to_indices[anchor_id], size=2, replace=False)
        other_ids = [i for i in valid_ids if i != anchor_id]
        neg_id = generator.choice(other_ids)
        n_idx = generator.choice(id_to_indices[neg_id])
        anchors.append(a_idx)
        positives.append(p_idx)
        negatives.append(n_idx)
    return np.array(anchors), np.array(positives), np.array(negatives)
class TemplateDecoder(nn.Module):
    def __init__(self, template_dim, embedding_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(template_dim, 1024),
            nn.BatchNorm1d(1024),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.2),
            nn.Linear(1024, 1024),
            nn.BatchNorm1d(1024),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.2),
            nn.Linear(1024, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.2),
            nn.Linear(512, embedding_dim),
        )

    def forward(self, x):
        out = self.net(x)
        return F.normalize(out, p=2, dim=1)

def train_decoder(templates, targets, epochs, lr, seed):
    torch.manual_seed(seed)
    decoder = TemplateDecoder(templates.shape[1], targets.shape[1]).to(DEVICE)
    optimizer = torch.optim.Adam(decoder.parameters(), lr=lr)
    loss_fn = nn.CosineEmbeddingLoss()
    templates_tensor = torch.tensor(templates, dtype=torch.float32).to(DEVICE)
    targets_tensor = torch.tensor(targets, dtype=torch.float32).to(DEVICE)
    ones = torch.ones(templates_tensor.shape[0]).to(DEVICE)
    loss_history = []
    for epoch in range(epochs):
        reconstructed = decoder(templates_tensor)
        loss = loss_fn(reconstructed, targets_tensor, ones)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        loss_history.append(loss.item())
    return decoder, loss_history

DECODER_EPOCHS = 200
DECODER_LR = 1e-3

reconstruction_target_ids = set(mated_df["identity"].unique())
eval_mask = np.isin(gallery_identities_array, list(reconstruction_target_ids))
N_eff_reconstruction = int(eval_mask.sum())
print(f"Ukuran sampel efektif N_eff untuk serangan rekonstruksi: {N_eff_reconstruction} identitas")

decoders = {}
decoder_histories = {}
for method_name in METHODS:
    if method_name == "Random Projection":
        method_train_t = training_rp
    elif method_name == "BioHashing":
        method_train_t = training_bh
    else:
        with torch.no_grad():
            method_train_t = proposed_net(training_proposed_input_tensor).cpu().numpy()
    decoder, loss_hist = train_decoder(method_train_t, training_embeddings, DECODER_EPOCHS, DECODER_LR, RANDOM_SEED)
    decoders[method_name] = decoder
    decoder_histories[method_name] = loss_hist

def evaluate_reconstruction(decoder, protected_templates, true_embeddings, reference_embeddings, reference_identities, protected_identities):
    with torch.no_grad():
        reconstructed = decoder(torch.tensor(protected_templates, dtype=torch.float32).to(DEVICE)).cpu().numpy()
    cosine_to_true = np.sum(reconstructed * true_embeddings, axis=1)
    similarity_to_reference = reconstructed @ reference_embeddings.T
    nearest_idx = np.argmax(similarity_to_reference, axis=1)
    predicted_identity = reference_identities[nearest_idx]
    reid_success = predicted_identity == protected_identities
    return cosine_to_true, reid_success

reconstruction_results = {}
for method_name in METHODS:
    if method_name == "Random Projection":
        g_t = gallery_rp
    elif method_name == "BioHashing":
        g_t = gallery_bh
    else:
        g_t = gallery_proposed
    cos_true, reid_succ = evaluate_reconstruction(
        decoders[method_name],
        g_t[eval_mask],
        gallery_embeddings[eval_mask],
        mated_embeddings,
        mated_df["identity"].to_numpy(dtype=object),
        gallery_identities_array[eval_mask],
    )
    reconstruction_results[method_name] = {"cosine_to_true": cos_true, "reid_success": reid_succ}

reconstruction_summary_df = pd.DataFrame([
    {
        "Metode": method_name,
        "Rata Rata Kemiripan Kosinus": reconstruction_results[method_name]["cosine_to_true"].mean(),
        "Tingkat Keberhasilan Reidentifikasi": reconstruction_results[method_name]["reid_success"].mean(),
        "Ukuran Sampel N_eff": N_eff_reconstruction,
    }
    for method_name in METHODS
])
reconstruction_summary_df