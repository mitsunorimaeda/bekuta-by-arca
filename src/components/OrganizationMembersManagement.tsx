import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCheck, UserX, Shield, Mail, Trash2, Search } from 'lucide-react';

interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user_email?: string;
  user_name?: string;
}

interface OrganizationMembersManagementProps {
  organizationId: string;
  organizationName: string;
}

export function OrganizationMembersManagement({ organizationId, organizationName }: OrganizationMembersManagementProps) {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          joined_at,
          users:user_id (
            email,
            full_name
          )
        `)
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedMembers = (data || []).map(member => ({
        id: member.id,
        user_id: member.user_id,
        organization_id: member.organization_id,
        role: member.role,
        joined_at: member.joined_at,
        user_email: (member as any).users?.email,
        user_name: (member as any).users?.full_name
      }));

      setMembers(formattedMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('メンバーの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (updateError) throw updateError;

      setSuccess('ロールを更新しました');
      fetchMembers();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('ロールの更新に失敗しました');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('このメンバーを組織から削除しますか？')) return;

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (deleteError) throw deleteError;

      setSuccess('メンバーを削除しました');
      fetchMembers();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('メンバーの削除に失敗しました');
    }
  };

  const filteredMembers = members.filter(member =>
    (member.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     member.user_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{organizationName} - メンバー管理</h2>
          <p className="text-sm text-gray-600 mt-1">組織のメンバーとロールを管理</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="メンバーを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メンバー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ロール
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  参加日
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    メンバーが見つかりません
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{member.user_name || '名前なし'}</div>
                        <div className="text-sm text-gray-500">{member.user_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.id, e.target.value as 'admin' | 'member')}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="member">メンバー</option>
                        <option value="admin">管理者</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(member.joined_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">ロールについて</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>管理者:</strong> 組織の設定変更、メンバー管理が可能</li>
              <li><strong>メンバー:</strong> 組織のデータ閲覧が可能</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
